import { spawn } from "node:child_process";
import process from "node:process";

import { StudioError } from "./errors.mjs";

const DEFAULT_MAX_OUTPUT = 512 * 1024;

export function runProcess(command, args, {
  cwd,
  env = {},
  timeoutMs = 120_000,
  maxOutputBytes = DEFAULT_MAX_OUTPUT,
  acceptedExitCodes = [0],
} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        LC_ALL: "C",
        ...env,
      },
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let settled = false;

    const append = (target, chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        child.kill("SIGTERM");
        return target;
      }
      return target + chunk.toString("utf8");
    };
    child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });

    const timer = setTimeout(() => {
      if (settled) return;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1_000).unref();
    }, timeoutMs);
    timer.unref();

    child.once("error", (error) => {
      settled = true;
      clearTimeout(timer);
      reject(new StudioError("PROCESS_START_FAILED", `No se pudo iniciar ${command}.`, {
        status: 500,
        details: { reason: error.message },
      }));
    });
    child.once("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (outputBytes > maxOutputBytes) {
        reject(new StudioError("PROCESS_OUTPUT_LIMIT", `La salida de ${command} excedió el límite seguro.`, { status: 500 }));
        return;
      }
      if (!acceptedExitCodes.includes(code)) {
        reject(new StudioError("PROCESS_FAILED", `${command} terminó con errores.`, {
          status: 422,
          details: {
            exitCode: code,
            signal,
            stdout: stdout.slice(-12_000),
            stderr: stderr.slice(-12_000),
          },
        }));
        return;
      }
      resolve({ code, stdout, stderr });
    });
  });
}

export function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
