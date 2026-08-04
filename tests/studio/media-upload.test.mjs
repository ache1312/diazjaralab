import assert from "node:assert/strict";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import { MediaUploadService, mediaUploadLimits } from "../../scripts/studio/media-upload-service.mjs";
import { isEditorialPath } from "../../scripts/studio/paths.mjs";
import { createStudioServer } from "../../scripts/studio/server.mjs";
import { initializeRepository, temporaryDirectory } from "./helpers.mjs";

const TOKEN = "media-test-token-with-sufficient-entropy";
const ORIGIN = "http://localhost:4321";
const METADATA = Object.freeze({
  alt: { es: "Micrografía de prueba", en: "Test micrograph" },
  caption: { es: "Campo científico representativo.", en: "Representative scientific field." },
  credit: { es: "Laboratorio Díaz-Jara", en: "Díaz-Jara Laboratory" },
  technique: { es: "Microscopía de fluorescencia", en: "Fluorescence microscopy" },
  provenance: { es: "Adquisición local del laboratorio", en: "Local laboratory acquisition" },
});

async function mediaApi(context) {
  const root = await temporaryDirectory("studio-media-api-");
  const originalsDirectory = await temporaryDirectory("studio-media-originals-");
  await initializeRepository(root, { commit: false });
  const history = {
    initialize: async () => {},
    stop: () => {},
    stats: async () => ({ documents: 0, snapshots: 0 }),
    snapshot: async () => {},
  };
  const media = new MediaUploadService({ root, originalsDirectory, history });
  const studio = await createStudioServer({
    root,
    port: 0,
    token: TOKEN,
    history,
    media,
    initializeHistory: false,
    git: { status: async () => ({ repository: true }), validate: async () => ({ ok: true }) },
    publications: {},
  });
  const address = await studio.listen();
  context.after(async () => {
    await studio.close();
    await Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(originalsDirectory, { recursive: true, force: true }),
    ]);
  });
  return {
    root,
    originalsDirectory,
    uploadsDirectory: path.join(root, ".studio", "uploads"),
    base: `http://127.0.0.1:${address.port}`,
  };
}

function authorizedHeaders(contentType = "application/json") {
  return {
    Origin: ORIGIN,
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": contentType,
  };
}

async function prepare(base, input, token = TOKEN) {
  return fetch(`${base}/api/media/upload/prepare`, {
    method: "POST",
    headers: {
      Origin: ORIGIN,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

test("la reserva de medios exige sesión y aplica 25/250 MB antes de recibir bytes", async (context) => {
  const api = await mediaApi(context);
  const baseInput = { filename: "documento.pdf", size: 10, kind: "document", metadata: METADATA };
  const unauthenticated = await fetch(`${api.base}/api/media/upload/prepare`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify(baseInput),
  });
  assert.equal(unauthenticated.status, 401);

  const pdfTooLarge = await prepare(api.base, {
    ...baseInput,
    size: mediaUploadLimits.pdfBytes + 1,
  });
  assert.equal(pdfTooLarge.status, 413);
  assert.equal((await pdfTooLarge.json()).error.code, "FILE_TOO_LARGE");

  const imageTooLarge = await prepare(api.base, {
    filename: "campo.tiff",
    size: mediaUploadLimits.tiffBytes + 1,
    kind: "micrograph",
    page: 1,
    metadata: METADATA,
  });
  assert.equal(imageTooLarge.status, 413);
  const unsafeReplacement = await prepare(api.base, {
    filename: "campo.png",
    size: 10,
    kind: "micrograph",
    replace: true,
    metadata: METADATA,
  });
  assert.equal(unsafeReplacement.status, 400);
  assert.equal((await unsafeReplacement.json()).error.code, "MEDIA_ID_REQUIRED");
  assert.deepEqual(await readdir(api.uploadsDirectory), []);
});

test("carga un stream autenticado, importa directamente y elimina todos los temporales", async (context) => {
  const api = await mediaApi(context);
  const image = await sharp({
    create: { width: 4, height: 3, channels: 3, background: "#7395a0" },
  }).png().toBuffer();
  const reservation = await prepare(api.base, {
    filename: "Campo GFAP.png",
    size: image.length,
    kind: "micrograph",
    metadata: METADATA,
  });
  assert.equal(reservation.status, 201);
  const operation = await reservation.json();

  const wrongToken = await fetch(`${api.base}${operation.uploadUrl}`, {
    method: "PUT",
    headers: {
      Origin: ORIGIN,
      Authorization: "Bearer incorrect-token",
      "Content-Type": "application/octet-stream",
    },
    body: image,
  });
  assert.equal(wrongToken.status, 401);

  const uploaded = await fetch(`${api.base}${operation.uploadUrl}`, {
    method: "PUT",
    headers: authorizedHeaders("application/octet-stream"),
    body: image,
  });
  assert.equal(uploaded.status, 201);
  const result = await uploaded.json();
  assert.equal(result.ok, true);
  assert.match(result.manifestPath, /^content\/media\/campo-gfap-[a-f0-9]{8}\.json$/);
  assert.match(result.masterPath, /^src\/assets\/media\//);
  assert.equal(isEditorialPath(result.manifestPath), true);
  assert.equal(isEditorialPath(result.masterPath), true);
  assert.equal(isEditorialPath(".studio/uploads/file.part"), false);
  assert.equal(isEditorialPath("media-originals/original.tiff"), false);
  assert.equal(JSON.parse(await readFile(path.join(api.root, result.manifestPath), "utf8")).kind, "micrograph");
  assert.deepEqual(await readdir(api.uploadsDirectory), []);
  assert.ok((await readdir(api.originalsDirectory, { recursive: true })).length > 0);
});

test("una carga con tamaño discordante se invalida y limpia inmediatamente", async (context) => {
  const api = await mediaApi(context);
  const payload = Buffer.from("not-a-real-png");
  const reservation = await prepare(api.base, {
    filename: "incompleto.png",
    size: payload.length + 1,
    kind: "figure",
    metadata: METADATA,
  });
  const operation = await reservation.json();
  const failed = await fetch(`${api.base}${operation.uploadUrl}`, {
    method: "POST",
    headers: authorizedHeaders("application/octet-stream"),
    body: payload,
  });
  assert.equal(failed.status, 422);
  assert.equal((await failed.json()).error.code, "UPLOAD_SIZE_MISMATCH");
  assert.deepEqual(await readdir(api.uploadsDirectory), []);

  const reused = await fetch(`${api.base}${operation.uploadUrl}`, {
    method: "PUT",
    headers: authorizedHeaders("application/octet-stream"),
    body: Buffer.alloc(payload.length + 1),
  });
  assert.equal(reused.status, 404);
});

test("las reservas vencidas desaparecen con sus directorios", async (context) => {
  const root = await temporaryDirectory("studio-media-expiry-");
  context.after(() => rm(root, { recursive: true, force: true }));
  let now = Date.parse("2026-08-03T12:00:00.000Z");
  const service = new MediaUploadService({ root, ttlMs: 100, now: () => now });
  await service.initialize();
  context.after(() => service.close());
  await service.prepare({ filename: "campo.png", size: 10, kind: "figure", metadata: METADATA });
  assert.equal(service.stats().pending, 1);
  assert.equal((await readdir(path.join(root, ".studio", "uploads"))).length, 1);
  now += 101;
  await service.prune();
  assert.equal(service.stats().pending, 0);
  assert.deepEqual(await readdir(path.join(root, ".studio", "uploads")), []);
});
