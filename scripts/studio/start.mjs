#!/usr/bin/env node

import { fork, spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..", "..");
const serverScript = path.join(scriptDirectory, "server.mjs");
const tinaBinary = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "tinacms.cmd" : "tinacms");

await access(tinaBinary).catch(() => {
  console.error("[studio] TinaCMS no está instalado. Ejecuta npm install antes de abrir el editor.");
  process.exit(1);
});

let service;
let editor;
let terminating = false;

function waitForService(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("El servicio local no respondió a tiempo.")), 20_000);
    timer.unref();
    const onMessage = (message) => {
      if (message?.type !== "ready") return;
      clearTimeout(timer);
      child.off("exit", onExit);
      resolve(message);
    };
    const onExit = (code) => {
      clearTimeout(timer);
      child.off("message", onMessage);
      reject(new Error(`El servicio local terminó antes de iniciar (${code}).`));
    };
    child.on("message", onMessage);
    child.once("exit", onExit);
  });
}

async function terminate(exitCode = 0) {
  if (terminating) return;
  terminating = true;
  if (service?.connected) service.send({ type: "close" });
  if (editor && editor.exitCode === null) editor.kill("SIGTERM");
  const hardStop = setTimeout(() => {
    if (service?.exitCode === null) service.kill("SIGKILL");
    if (editor?.exitCode === null) editor.kill("SIGKILL");
  }, 5_000);
  hardStop.unref();
  await Promise.all([
    service?.exitCode === null ? new Promise((resolve) => service.once("exit", resolve)) : undefined,
    editor?.exitCode === null ? new Promise((resolve) => editor.once("exit", resolve)) : undefined,
  ].filter(Boolean));
  clearTimeout(hardStop);
  process.exit(exitCode);
}

try {
  service = fork(serverScript, ["--root", root], {
    cwd: root,
    env: process.env,
    stdio: ["inherit", "inherit", "inherit", "ipc"],
  });
  service.on("message", (message) => {
    if (message?.type === "shutdown") terminate(0);
  });
  await waitForService(service);

  const editorEnvironment = {
    ...process.env,
    STUDIO_MODE: "true",
    TINA_EDIT: "true",
    STUDIO_API_URL: "http://127.0.0.1:4322",
  };
  // Astro 7 backgrounds itself when it detects Codex. Tina must retain the
  // foreground child so its GraphQL server and our local API share one clean
  // lifecycle when the user closes the editor.
  delete editorEnvironment.CODEX_THREAD_ID;

  editor = spawn(tinaBinary, ["dev", "-c", "astro dev --host 127.0.0.1 --port 4321"], {
    cwd: root,
    env: editorEnvironment,
    shell: false,
    stdio: "inherit",
  });
  editor.once("error", (error) => {
    console.error(`[studio] No se pudo iniciar TinaCMS: ${error.message}`);
    terminate(1);
  });
  editor.once("exit", (code, signal) => {
    if (!terminating) {
      const reason = signal ? `señal ${signal}` : `código ${code}`;
      console.log(`[studio] El editor web terminó (${reason}).`);
      terminate(code || 0);
    }
  });
  service.once("exit", (code) => {
    if (!terminating) {
      console.error(`[studio] El servicio local terminó inesperadamente (${code}).`);
      terminate(code || 1);
    }
  });
} catch (error) {
  console.error(`[studio] ${error.message}`);
  await terminate(1);
}

process.once("SIGINT", () => terminate(0));
process.once("SIGTERM", () => terminate(0));
