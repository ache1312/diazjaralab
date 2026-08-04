import assert from "node:assert/strict";
import { readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { HistoryStore } from "../../scripts/studio/history.mjs";
import { isEditorialPath, resolveEditorialPath } from "../../scripts/studio/paths.mjs";
import { temporaryDirectory, write } from "./helpers.mjs";

test("la allowlist acepta contenido y rechaza código o traversal", async (context) => {
  const root = await temporaryDirectory();
  context.after(() => rm(root, { recursive: true, force: true }));
  await write(root, "content/pages/home.json", "{}\n");

  assert.equal(isEditorialPath("content/pages/home.json"), true);
  assert.equal(isEditorialPath("public/uploads/cell.webp"), true);
  assert.equal(isEditorialPath("public/uploads/untrusted.svg"), false);
  assert.equal(isEditorialPath("src/components/Header.astro"), false);
  await assert.rejects(() => resolveEditorialPath(root, "../package.json", { allowMissing: true }), /ruta/i);

  const outside = await temporaryDirectory();
  context.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, path.join(root, "content", "linked"), "dir");
  await assert.rejects(
    () => resolveEditorialPath(root, "content/linked/escape.json", { allowMissing: true }),
    /enlaces simbólicos/i,
  );
});

test("el historial conserva 100 versiones y restaura sin perder el estado actual", async (context) => {
  const root = await temporaryDirectory();
  const storeDirectory = path.join(await temporaryDirectory(), "history");
  context.after(() => rm(root, { recursive: true, force: true }));
  context.after(() => rm(path.dirname(storeDirectory), { recursive: true, force: true }));
  const relative = "content/pages/home.json";
  const absolute = await write(root, relative, '{"version":0}\n');
  let clock = Date.parse("2026-01-01T00:00:00.000Z");
  const history = new HistoryStore({
    root,
    storeDirectory,
    maximumPerDocument: 100,
    now: () => new Date(clock += 1_000),
  });
  await history.initialize({ startWatcher: false, captureBaseline: true });

  for (let version = 1; version <= 105; version += 1) {
    await writeFile(absolute, `${JSON.stringify({ version })}\n`);
    await history.snapshot(relative, { reason: "test", skipIfDuplicate: false });
  }
  const versions = await history.list(relative);
  assert.equal(versions.entries.length, 100);
  assert.equal(versions.entries[0].reason, "test");

  const selected = versions.entries.at(-1);
  const result = await history.restore(relative, selected.id);
  assert.equal(result.safetySnapshot.reason, "before-restore");
  assert.equal(result.restoredFrom.id, selected.id);
  const restored = JSON.parse(await readFile(absolute, "utf8"));
  assert.equal(restored.version, 6);
  assert.equal((await history.list(relative)).entries.length, 100);
});
