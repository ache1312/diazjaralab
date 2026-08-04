import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";

import { PublicationsService } from "../../scripts/studio/publications-service.mjs";
import { temporaryDirectory, write } from "./helpers.mjs";

const refreshFixture = `
import { readFile, writeFile } from "node:fs/promises";
const file = "src/content-data/publications.generated.json";
const data = JSON.parse(await readFile(file, "utf8"));
data.generated_at = "2026-08-03";
data.counts.openalex_indexed = 2;
await writeFile(file, JSON.stringify(data));
console.log("fixture refresh complete");
`;

const graphFixture = `
import { readFile, writeFile } from "node:fs/promises";
const file = "src/content-data/publication-network.generated.json";
const data = JSON.parse(await readFile(file, "utf8"));
data.generatedAt = "2026-08-03T00:00:00.000Z";
data.stats = { papers: 2, themes: 4, similarityEdges: 1, themeEdges: 2 };
await writeFile(file, JSON.stringify(data));
console.log("fixture graph complete");
`;

async function fixtureRoot() {
  const root = await temporaryDirectory("studio-publications-");
  await write(root, "src/content-data/publications.generated.json", JSON.stringify({
    generated_at: "2025-01-01",
    counts: { openalex_indexed: 1, scholar_only: 1 },
    works: [{ id: 1 }, { id: 2 }],
  }));
  await write(root, "src/content-data/publication-network.generated.json", JSON.stringify({
    generatedAt: "2025-01-01T00:00:00.000Z",
    stats: { papers: 2, themes: 4, similarityEdges: 0, themeEdges: 2 },
  }));
  await write(root, "scripts/fixture-refresh.mjs", refreshFixture);
  await write(root, "scripts/fixture-network.mjs", graphFixture);
  return root;
}

test("la actualización bibliográfica prepara en temporal y solo escribe al confirmar", async (context) => {
  const root = await fixtureRoot();
  context.after(() => rm(root, { recursive: true, force: true }));
  const snapshots = [];
  const service = new PublicationsService({
    root,
    refreshScript: "scripts/fixture-refresh.mjs",
    networkScript: "scripts/fixture-network.mjs",
    history: { snapshot: async (relative) => snapshots.push(relative) },
  });

  const prepared = await service.prepare();
  assert.equal(prepared.summary.network.topics, 4);
  assert.equal(prepared.summary.catalogue.openAlexIndexed, 2);
  assert.equal(JSON.parse(await readFile(`${root}/src/content-data/publications.generated.json`, "utf8")).generated_at, "2025-01-01");

  const applied = await service.confirm(prepared.confirmationId);
  assert.equal(applied.ok, true);
  assert.deepEqual(snapshots, [
    "src/content-data/publications.generated.json",
    "src/content-data/publication-network.generated.json",
  ]);
  assert.equal(JSON.parse(await readFile(`${root}/src/content-data/publications.generated.json`, "utf8")).generated_at, "2026-08-03");
});
