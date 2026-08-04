import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runProcess } from "../../scripts/studio/process.mjs";

export async function temporaryDirectory(prefix = "studio-test-") {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function write(root, relative, content) {
  const absolute = path.join(root, ...relative.split("/"));
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
  return absolute;
}

export async function git(root, args) {
  return runProcess("git", args, { cwd: root, timeoutMs: 30_000 });
}

export async function initializeRepository(root, { commit = true } = {}) {
  await git(root, ["init", "-b", "main"]);
  await git(root, ["config", "user.name", "Studio Test"]);
  await git(root, ["config", "user.email", "studio@example.test"]);
  if (commit) {
    await git(root, ["add", "-A"]);
    await git(root, ["commit", "-m", "Initial test site"]);
  }
}
