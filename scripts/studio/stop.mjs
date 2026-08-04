#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { runProcess } from "./process.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..", "..");

async function findSessionFile() {
  try {
    const result = await runProcess("git", ["rev-parse", "--absolute-git-dir"], { cwd: root, timeoutMs: 10_000 });
    return path.join(result.stdout.trim(), "studio-session.json");
  } catch {
    return path.join(root, ".studio", "session.json");
  }
}

try {
  const session = JSON.parse(await readFile(await findSessionFile(), "utf8"));
  const response = await fetch(`http://127.0.0.1:${session.port}/api/shutdown`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`respuesta HTTP ${response.status}`);
  console.log("El editor local se está cerrando.");
} catch (error) {
  console.error(`No hay una sesión editorial activa o no pudo cerrarse: ${error.message}`);
  process.exitCode = 1;
}
