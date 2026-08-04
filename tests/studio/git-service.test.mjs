import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { StudioError } from "../../scripts/studio/errors.mjs";
import { GitService } from "../../scripts/studio/git-service.mjs";
import { git, initializeRepository, temporaryDirectory, write } from "./helpers.mjs";

async function createPublishedRepository(context) {
  const root = await temporaryDirectory("studio-work-");
  const remote = await temporaryDirectory("studio-bare-");
  context.after(() => rm(root, { recursive: true, force: true }));
  context.after(() => rm(remote, { recursive: true, force: true }));
  await write(root, "content/pages/home.json", '{"title":"Original"}\n');
  await write(root, "src/example.js", "export const untouched = true;\n");
  await initializeRepository(root);
  await git(remote, ["init", "--bare"]);
  await git(root, ["remote", "add", "origin", remote]);
  await git(root, ["push", "--set-upstream", "origin", "main"]);
  return { root, remote };
}

test("publica únicamente archivos editoriales y deja el código fuera del commit", async (context) => {
  const { root, remote } = await createPublishedRepository(context);
  await write(root, "content/pages/home.json", '{"title":"Actualizado"}\n');
  await write(root, "src/example.js", "export const untouched = false;\n");
  const service = new GitService({ root, validationCommands: [], allowLocalRemotes: true });

  const prepared = await service.preparePublish({ message: "Actualizar portada" });
  assert.deepEqual(prepared.changes.map((entry) => entry.path), ["content/pages/home.json"]);
  assert.deepEqual(prepared.ignoredChanges.map((entry) => entry.path), ["src/example.js"]);
  const published = await service.confirmPublish({ confirmationId: prepared.confirmationId });
  assert.match(published.commit, /^[a-f0-9]{40}$/);

  const remoteContent = await git(remote, ["show", "main:content/pages/home.json"]);
  const remoteCode = await git(remote, ["show", "main:src/example.js"]);
  assert.match(remoteContent.stdout, /Actualizado/);
  assert.match(remoteCode.stdout, /true/);
  assert.match(await readFile(path.join(root, "src/example.js"), "utf8"), /false/);
  const status = await service.statusEntries();
  assert.deepEqual(status.map((entry) => entry.path), ["src/example.js"]);
});

test("bloquea la publicación cuando el remoto dejó de ser fast-forward", async (context) => {
  const { root, remote } = await createPublishedRepository(context);
  const other = await temporaryDirectory("studio-other-");
  context.after(() => rm(other, { recursive: true, force: true }));
  await git(other, ["clone", "--branch", "main", remote, "."]);
  await git(other, ["config", "user.name", "Other Editor"]);
  await git(other, ["config", "user.email", "other@example.test"]);
  await write(other, "content/pages/home.json", '{"title":"Remoto"}\n');
  await git(other, ["add", "content/pages/home.json"]);
  await git(other, ["commit", "-m", "Remote change"]);
  await git(other, ["push", "origin", "main"]);

  await write(root, "content/pages/home.json", '{"title":"Local"}\n');
  const service = new GitService({ root, validationCommands: [], allowLocalRemotes: true });
  await assert.rejects(
    () => service.preparePublish({ message: "Cambio local" }),
    (error) => error instanceof StudioError && error.code === "REMOTE_NOT_FAST_FORWARD",
  );
});

test("la configuración inicial requiere revisión y crea el primer push sin force", async (context) => {
  const root = await temporaryDirectory("studio-unborn-");
  const remote = await temporaryDirectory("studio-empty-bare-");
  context.after(() => rm(root, { recursive: true, force: true }));
  context.after(() => rm(remote, { recursive: true, force: true }));
  await write(root, "content/pages/home.json", '{"title":"Inicio"}\n');
  await write(root, "package.json", '{"private":true}\n');
  await initializeRepository(root, { commit: false });
  await git(remote, ["init", "--bare"]);
  const service = new GitService({ root, validationCommands: [], allowLocalRemotes: true });

  const prepared = await service.prepareSetup({
    remoteUrl: remote,
    branch: "main",
    authorName: "Dr. Díaz",
    authorEmail: "diaz@example.test",
  });
  assert.equal(prepared.initialized, false);
  assert.deepEqual(prepared.files, ["content/pages/home.json", "package.json"]);
  const configured = await service.confirmSetup({ confirmationId: prepared.confirmationId });
  assert.match(configured.commit, /^[a-f0-9]{40}$/);
  assert.match((await git(remote, ["show", "main:content/pages/home.json"])).stdout, /Inicio/);
  const status = await service.status();
  assert.equal(status.remote, remote);
  assert.equal(status.synchronization?.behind, 0);
});
