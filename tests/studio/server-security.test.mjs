import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";

import { createStudioServer } from "../../scripts/studio/server.mjs";
import { initializeRepository, temporaryDirectory, write } from "./helpers.mjs";

test("la API exige origen local y token de sesión", async (context) => {
  const root = await temporaryDirectory("studio-api-");
  context.after(() => rm(root, { recursive: true, force: true }));
  await write(root, "content/pages/home.json", "{}\n");
  await initializeRepository(root);
  const fakeHistory = {
    initialize: async () => {},
    stop: () => {},
    list: async (path) => ({ path, entries: [] }),
    restore: async () => ({}),
  };
  const fakeGit = {
    status: async () => ({ repository: true }),
    validate: async () => ({ ok: true, checks: [] }),
  };
  const studio = await createStudioServer({
    root,
    port: 0,
    token: "test-token-that-is-long-enough",
    history: fakeHistory,
    git: fakeGit,
    publications: {},
    initializeHistory: false,
  });
  context.after(() => studio.close());
  const address = await studio.listen();
  const base = `http://127.0.0.1:${address.port}`;

  assert.equal((await fetch(`${base}/health`)).status, 200);
  assert.equal((await fetch(`${base}/api/status`)).status, 401);
  assert.equal((await fetch(`${base}/api/session`, { headers: { Origin: "https://evil.example" } })).status, 403);

  const sessionResponse = await fetch(`${base}/api/session`, { headers: { Origin: "http://localhost:4321" } });
  assert.equal(sessionResponse.status, 200);
  assert.equal((await sessionResponse.json()).token, "test-token-that-is-long-enough");
  const statusResponse = await fetch(`${base}/api/status`, {
    headers: {
      Origin: "http://localhost:4321",
      Authorization: "Bearer test-token-that-is-long-enough",
    },
  });
  assert.equal(statusResponse.status, 200);
  assert.equal((await statusResponse.json()).repository, true);
  const documentsResponse = await fetch(`${base}/api/documents`, {
    headers: {
      Origin: "http://localhost:4321",
      Authorization: "Bearer test-token-that-is-long-enough",
    },
  });
  assert.equal(documentsResponse.status, 200);
  assert.deepEqual((await documentsResponse.json()).paths, ["content/pages/home.json"]);
});
