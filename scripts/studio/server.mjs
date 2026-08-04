#!/usr/bin/env node

import { randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { StudioError, assertStudio, publicError } from "./errors.mjs";
import { GitService } from "./git-service.mjs";
import { HistoryStore } from "./history.mjs";
import { MediaUploadService } from "./media-upload-service.mjs";
import { listEditorialFiles } from "./paths.mjs";
import { PublicationsService } from "./publications-service.mjs";
import { runProcess } from "./process.mjs";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4322;
const MAX_BODY_BYTES = 256 * 1024;
const DEFAULT_ORIGINS = ["http://localhost:4321", "http://127.0.0.1:4321"];

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") options.root = argv[++index];
    else if (value === "--port") options.port = Number(argv[++index]);
    else if (value === "--host") options.host = argv[++index];
    else throw new StudioError("INVALID_ARGUMENT", `Argumento desconocido: ${value}`);
  }
  return options;
}

function tokenMatches(expected, actual) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual || "");
  return left.length === right.length && timingSafeEqual(left, right);
}

function securityHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Cross-Origin-Resource-Policy", "same-site");
}

function send(response, status, body) {
  securityHeaders(response);
  response.statusCode = status;
  response.end(`${JSON.stringify(body)}\n`);
}

async function readJson(request) {
  const contentType = String(request.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
  assertStudio(contentType === "application/json", "UNSUPPORTED_CONTENT_TYPE", "Las operaciones deben enviarse como application/json.", {
    status: 415,
  });
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw new StudioError("BODY_TOO_LARGE", "La solicitud supera el límite permitido.", { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    assertStudio(value && typeof value === "object" && !Array.isArray(value), "INVALID_JSON", "El cuerpo debe ser un objeto JSON.");
    return value;
  } catch (error) {
    if (error instanceof StudioError) throw error;
    throw new StudioError("INVALID_JSON", "El cuerpo JSON no es válido.");
  }
}

async function sessionFile(root) {
  try {
    const result = await runProcess("git", ["rev-parse", "--absolute-git-dir"], { cwd: root, timeoutMs: 10_000 });
    return path.join(result.stdout.trim(), "studio-session.json");
  } catch {
    return path.join(root, ".studio", "session.json");
  }
}

export async function createStudioServer({
  root = process.cwd(),
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  token = randomBytes(32).toString("base64url"),
  allowedOrigins = DEFAULT_ORIGINS,
  history,
  git,
  media,
  publications,
  initializeHistory = true,
  initializeMedia = true,
} = {}) {
  const projectRoot = path.resolve(root);
  assertStudio(host === "127.0.0.1", "UNSAFE_BIND_ADDRESS", "El servicio editorial solo puede escuchar en 127.0.0.1.");
  assertStudio(Number.isInteger(port) && port >= 0 && port <= 65_535, "INVALID_PORT", "El puerto del servicio no es válido.");
  const origins = new Set(allowedOrigins);
  const historyStore = history ?? new HistoryStore({ root: projectRoot });
  if (initializeHistory) await historyStore.initialize();
  const gitService = git ?? new GitService({ root: projectRoot, history: historyStore });
  const mediaService = media ?? new MediaUploadService({ root: projectRoot, history: historyStore });
  if (initializeMedia) await mediaService.initialize();
  const publicationsService = publications ?? new PublicationsService({ root: projectRoot, history: historyStore });
  const currentSessionFile = await sessionFile(projectRoot);
  let actualPort = port;
  let closing = false;

  const server = http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    const hostHeader = String(request.headers.host || "");
    try {
      const hostName = hostHeader.replace(/^\[/, "").split(/\]:|:/, 1)[0].toLowerCase();
      assertStudio(hostName === "127.0.0.1" || hostName === "localhost", "INVALID_HOST", "Host local no permitido.", { status: 403 });
      if (origin) {
        assertStudio(origins.has(origin), "ORIGIN_NOT_ALLOWED", "El origen no pertenece al editor local.", { status: 403 });
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Vary", "Origin");
      }

      if (request.method === "OPTIONS") {
        assertStudio(Boolean(origin), "ORIGIN_REQUIRED", "Falta el origen del editor.", { status: 403 });
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Studio-Token");
        response.setHeader("Access-Control-Max-Age", "600");
        send(response, 204, {});
        return;
      }

      const url = new URL(request.url, `http://${hostHeader}`);
      if (request.method === "GET" && url.pathname === "/health") {
        send(response, 200, { ok: true, service: "diaz-jara-lab-studio", version: 1 });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/session") {
        assertStudio(Boolean(origin) && origins.has(origin), "ORIGIN_REQUIRED", "La sesión solo se entrega al editor local.", { status: 403 });
        send(response, 200, { ok: true, token, apiUrl: `http://127.0.0.1:${actualPort}` });
        return;
      }

      const authorization = String(request.headers.authorization || "");
      const suppliedToken = authorization.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length)
        : String(request.headers["x-studio-token"] || "");
      assertStudio(tokenMatches(token, suppliedToken), "UNAUTHORIZED", "La sesión editorial no es válida.", { status: 401 });

      if (request.method === "GET" && url.pathname === "/api/status") {
        send(response, 200, { ok: true, ...(await gitService.status()), uploads: mediaService.stats?.() ?? null });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/documents") {
        const paths = (await listEditorialFiles(projectRoot)).filter((relative) => /\.(?:json|ya?ml|mdx?|txt|csv|bib)$/i.test(relative));
        send(response, 200, { ok: true, paths });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/history") {
        const relative = url.searchParams.get("path");
        assertStudio(relative, "MISSING_PATH", "Debes indicar el documento.");
        send(response, 200, { ok: true, ...(await historyStore.list(relative, { limit: url.searchParams.get("limit") })) });
        return;
      }
      if (request.method === "POST" && (url.pathname === "/api/history/restore" || url.pathname === "/api/restore")) {
        const body = await readJson(request);
        send(response, 200, { ok: true, ...(await historyStore.restore(body.path, body.snapshotId)) });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/validate") {
        await readJson(request);
        send(response, 200, await gitService.validate());
        return;
      }
      if (request.method === "POST" && (url.pathname === "/api/media/upload/prepare" || url.pathname === "/api/media/prepare")) {
        send(response, 201, { ok: true, ...(await mediaService.prepare(await readJson(request))) });
        return;
      }
      const mediaUploadMatch = url.pathname.match(/^\/api\/media\/upload\/([A-Za-z0-9_-]{32})$/);
      if ((request.method === "PUT" || request.method === "POST") && mediaUploadMatch) {
        request.setTimeout(10 * 60 * 1_000);
        send(response, 201, await mediaService.receive(mediaUploadMatch[1], request));
        return;
      }
      if (request.method === "POST" && (url.pathname === "/api/git/setup/prepare" || url.pathname === "/api/setup-git")) {
        const body = await readJson(request);
        if (url.pathname === "/api/setup-git" && body.action === "confirm") {
          send(response, 200, await gitService.confirmSetup(body));
        } else {
          send(response, 200, { ok: true, ...(await gitService.prepareSetup(body)) });
        }
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/git/setup/confirm") {
        send(response, 200, await gitService.confirmSetup(await readJson(request)));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/publish/prepare") {
        send(response, 200, { ok: true, ...(await gitService.preparePublish(await readJson(request))) });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/publish/confirm") {
        send(response, 200, await gitService.confirmPublish(await readJson(request)));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/publish") {
        const body = await readJson(request);
        if (body.action === "confirm") send(response, 200, await gitService.confirmPublish(body));
        else send(response, 200, { ok: true, ...(await gitService.preparePublish(body)) });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/publications/refresh/prepare") {
        await readJson(request);
        send(response, 200, { ok: true, ...(await publicationsService.prepare()) });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/publications/refresh/confirm") {
        const body = await readJson(request);
        send(response, 200, await publicationsService.confirm(body.confirmationId));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/publications/refresh") {
        const body = await readJson(request);
        if (body.action === "confirm") send(response, 200, await publicationsService.confirm(body.confirmationId));
        else send(response, 200, { ok: true, ...(await publicationsService.prepare()) });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/shutdown") {
        await readJson(request);
        send(response, 202, { ok: true, message: "Cerrando el editor local." });
        if (!closing) {
          closing = true;
          setImmediate(() => {
            if (process.send) process.send({ type: "shutdown" });
            else close();
          });
        }
        return;
      }
      throw new StudioError("NOT_FOUND", "La operación solicitada no existe.", { status: 404 });
    } catch (error) {
      if (!(error instanceof StudioError)) console.error(error);
      const output = publicError(error);
      send(response, output.status, output.body);
    }
  });

  server.keepAliveTimeout = 5_000;
  server.headersTimeout = 10_000;
  server.requestTimeout = 10 * 60 * 1_000;

  async function listen() {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => {
        server.off("error", reject);
        resolve();
      });
    });
    actualPort = server.address().port;
    await mkdir(path.dirname(currentSessionFile), { recursive: true });
    await writeFile(currentSessionFile, `${JSON.stringify({
      version: 1,
      pid: process.pid,
      parentPid: process.ppid,
      host,
      port: actualPort,
      token,
      startedAt: new Date().toISOString(),
    })}\n`, { mode: 0o600 });
    await chmod(currentSessionFile, 0o600).catch(() => {});
    return { host, port: actualPort, token, sessionFile: currentSessionFile };
  }

  async function close() {
    historyStore.stop?.();
    await mediaService.close?.();
    await new Promise((resolve) => {
      if (!server.listening) resolve();
      else server.close(() => resolve());
    });
    await rm(currentSessionFile, { force: true }).catch(() => {});
  }

  return { server, listen, close, token, history: historyStore, git: gitService, media: mediaService, publications: publicationsService };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const studio = await createStudioServer(options);
  const address = await studio.listen();
  console.log(`[studio] Servicio local listo en http://${address.host}:${address.port}`);
  if (process.send) process.send({ type: "ready", host: address.host, port: address.port });

  const close = async () => {
    await studio.close();
    process.exit(0);
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  process.on("message", (message) => {
    if (message?.type === "close") close();
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((error) => {
  console.error(error instanceof StudioError ? `[studio] ${error.message}` : error);
  process.exit(1);
});
