import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { chmod, lstat, mkdir, readdir, realpath, rename, rm, stat } from "node:fs/promises";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

import { MEDIA_LIMITS } from "../media/constants.mjs";
import { MediaImportError, importMedia, safeSlug } from "../media/importer.mjs";
import { validateEditorialMetadata, validateKind } from "../media/metadata.mjs";
import { StudioError, assertStudio } from "./errors.mjs";

const DEFAULT_TTL_MS = 10 * 60 * 1_000;
const MAX_PENDING_UPLOADS = 32;
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tif", ".tiff", ".pdf"]);

function operationId() {
  return randomBytes(24).toString("base64url");
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function mediaErrorToStudio(error) {
  if (error instanceof StudioError) return error;
  if (error instanceof MediaImportError) {
    return new StudioError(error.code, error.message, { status: 422, details: error.details });
  }
  return error;
}

function normalizeFilename(value) {
  assertStudio(typeof value === "string", "FILENAME_REQUIRED", "Debes indicar el nombre del archivo.");
  const filename = value.normalize("NFC").trim();
  assertStudio(filename.length >= 3 && filename.length <= 240, "FILENAME_INVALID", "El nombre del archivo no es válido.");
  assertStudio(
    path.posix.basename(filename) === filename && path.win32.basename(filename) === filename && !/[\0-\x1f\x7f]/.test(filename),
    "FILENAME_INVALID",
    "El nombre no puede contener carpetas ni caracteres de control.",
  );
  const extension = path.extname(filename).toLowerCase();
  assertStudio(ALLOWED_EXTENSIONS.has(extension), "MEDIA_EXTENSION_NOT_ALLOWED", "El formato indicado no está permitido.", {
    status: 415,
    details: { extension },
  });
  return { filename, extension };
}

function declaredFamily(extension) {
  return extension === ".pdf" ? "document" : "raster";
}

function declaredLimit(extension) {
  return extension === ".pdf" ? MEDIA_LIMITS.pdfBytes : MEDIA_LIMITS.rasterBytes;
}

function normalizePrepareInput(input) {
  const { filename, extension } = normalizeFilename(input.filename);
  assertStudio(Number.isSafeInteger(input.size) && input.size > 0, "MEDIA_SIZE_INVALID", "El tamaño declarado debe ser un entero positivo.");
  const maximumBytes = declaredLimit(extension);
  assertStudio(input.size <= maximumBytes, "FILE_TOO_LARGE", `El archivo supera el máximo permitido de ${Math.round(maximumBytes / 1024 / 1024)} MB.`, {
    status: 413,
    details: { declaredBytes: input.size, maximumBytes },
  });
  let metadata;
  let kind;
  try {
    metadata = validateEditorialMetadata(input.metadata);
    kind = validateKind(input.kind, declaredFamily(extension));
  } catch (error) {
    throw mediaErrorToStudio(error);
  }
  const isTiff = extension === ".tif" || extension === ".tiff";
  if (input.page !== undefined) {
    assertStudio(isTiff, "PAGE_NOT_APPLICABLE", "La selección de página solo se admite para TIFF.");
    assertStudio(Number.isSafeInteger(input.page) && input.page >= 1, "TIFF_PAGE_INVALID", "La página TIFF debe ser un entero mayor o igual a 1.");
  }
  assertStudio(input.replace === undefined || typeof input.replace === "boolean", "REPLACE_INVALID", "replace debe ser verdadero o falso.");
  assertStudio(input.id === undefined || typeof input.id === "string", "MEDIA_ID_INVALID", "El ID editorial debe ser texto.");
  let id;
  try {
    id = input.id === undefined ? undefined : safeSlug(input.id);
  } catch (error) {
    throw mediaErrorToStudio(error);
  }
  assertStudio(input.replace !== true || Boolean(id), "MEDIA_ID_REQUIRED", "Para reemplazar un medio debes indicar su ID estable.");
  return {
    filename,
    extension,
    size: input.size,
    kind,
    page: input.page,
    metadata,
    id,
    replace: input.replace === true,
    maximumBytes,
  };
}

export class MediaUploadService {
  constructor({
    root,
    history,
    originalsDirectory,
    temporaryRoot,
    ttlMs = DEFAULT_TTL_MS,
    now = () => Date.now(),
    importer = importMedia,
    maximumPendingUploads = MAX_PENDING_UPLOADS,
  } = {}) {
    assertStudio(root, "MISSING_ROOT", "Falta la carpeta raíz del proyecto.");
    this.root = path.resolve(root);
    this.history = history;
    this.originalsDirectory = originalsDirectory;
    this.temporaryRoot = path.resolve(temporaryRoot ?? path.join(this.root, ".studio", "uploads"));
    this.ttlMs = ttlMs;
    this.now = now;
    this.importer = importer;
    this.maximumPendingUploads = maximumPendingUploads;
    this.operations = new Map();
    this.timer = null;
    this.pruning = false;
  }

  async initialize() {
    assertStudio(inside(this.root, this.temporaryRoot), "UNSAFE_UPLOAD_DIRECTORY", "Los temporales de carga deben estar dentro de .studio.", { status: 500 });
    const studioRoot = path.join(this.root, ".studio");
    assertStudio(inside(studioRoot, this.temporaryRoot), "UNSAFE_UPLOAD_DIRECTORY", "Los temporales de carga deben estar dentro de .studio.", { status: 500 });
    try {
      const existingStudio = await lstat(studioRoot);
      assertStudio(!existingStudio.isSymbolicLink() && existingStudio.isDirectory(), "UNSAFE_UPLOAD_DIRECTORY", ".studio no puede ser un enlace simbólico.", { status: 500 });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await mkdir(studioRoot, { recursive: true, mode: 0o700 });
    await mkdir(this.temporaryRoot, { recursive: true, mode: 0o700 });
    const temporaryInfo = await lstat(this.temporaryRoot);
    assertStudio(!temporaryInfo.isSymbolicLink() && temporaryInfo.isDirectory(), "UNSAFE_UPLOAD_DIRECTORY", "uploads no puede ser un enlace simbólico.", { status: 500 });
    const [canonicalRoot, canonicalTemporary] = await Promise.all([realpath(this.root), realpath(this.temporaryRoot)]);
    assertStudio(inside(canonicalRoot, canonicalTemporary), "UNSAFE_UPLOAD_DIRECTORY", "El directorio temporal sale del proyecto.", { status: 500 });
    await chmod(studioRoot, 0o700).catch(() => {});
    await chmod(this.temporaryRoot, 0o700).catch(() => {});

    // Upload IDs live only in memory. Anything left from a previous process is
    // therefore unresumable and is removed before accepting new data.
    for (const entry of await readdir(this.temporaryRoot)) {
      await rm(path.join(this.temporaryRoot, entry), { recursive: true, force: true });
    }
    this.timer = setInterval(() => this.prune().catch((error) => {
      console.error(`[studio] No se pudieron limpiar cargas vencidas: ${error.message}`);
    }), Math.min(this.ttlMs, 60_000));
    this.timer.unref();
    return { temporaryRoot: this.temporaryRoot };
  }

  async prepare(input = {}) {
    await this.prune();
    assertStudio(this.operations.size < this.maximumPendingUploads, "TOO_MANY_UPLOADS", "Hay demasiadas cargas pendientes. Espera o reinicia el editor.", { status: 429 });
    const normalized = normalizePrepareInput(input);
    const uploadId = operationId();
    const operationDirectory = path.join(this.temporaryRoot, uploadId);
    await mkdir(operationDirectory, { mode: 0o700 });
    const partialPath = path.join(operationDirectory, `${normalized.filename}.part`);
    const completedPath = path.join(operationDirectory, normalized.filename);
    const expiresAt = this.now() + this.ttlMs;
    this.operations.set(uploadId, {
      ...normalized,
      uploadId,
      operationDirectory,
      partialPath,
      completedPath,
      state: "pending",
      createdAt: this.now(),
      expiresAt,
    });
    return {
      uploadId,
      uploadUrl: `/api/media/upload/${uploadId}`,
      method: "PUT",
      contentType: "application/octet-stream",
      declaredBytes: normalized.size,
      maximumBytes: normalized.maximumBytes,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  async receive(uploadId, request) {
    await this.prune();
    const operation = this.operations.get(String(uploadId || ""));
    assertStudio(operation, "UPLOAD_NOT_FOUND", "La carga caducó o no existe.", { status: 404 });
    assertStudio(operation.state === "pending", "UPLOAD_ALREADY_USED", "La carga ya fue utilizada.", { status: 409 });
    operation.state = "receiving";
    try {
      const contentType = String(request.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
      assertStudio(contentType === "application/octet-stream", "UNSUPPORTED_CONTENT_TYPE", "La carga binaria debe usar application/octet-stream.", { status: 415 });
      assertStudio(!request.headers["content-encoding"] || request.headers["content-encoding"] === "identity", "CONTENT_ENCODING_NOT_ALLOWED", "No se aceptan cargas comprimidas en tránsito.", { status: 415 });
      const declaredHeader = request.headers["content-length"];
      if (declaredHeader !== undefined) {
        const contentLength = Number(declaredHeader);
        assertStudio(Number.isSafeInteger(contentLength) && contentLength === operation.size, "UPLOAD_SIZE_MISMATCH", "Content-Length no coincide con el tamaño revisado.", {
          status: 422,
          details: { expectedBytes: operation.size, receivedHeaderBytes: contentLength },
        });
      }

      let receivedBytes = 0;
      const counter = new Transform({
        transform(chunk, _encoding, callback) {
          receivedBytes += chunk.length;
          if (receivedBytes > operation.size || receivedBytes > operation.maximumBytes) {
            callback(new StudioError("FILE_TOO_LARGE", "La carga superó el tamaño previamente autorizado.", { status: 413 }));
            return;
          }
          callback(null, chunk);
        },
      });
      await pipeline(request, counter, createWriteStream(operation.partialPath, { flags: "wx", mode: 0o600 }));
      assertStudio(receivedBytes === operation.size, "UPLOAD_SIZE_MISMATCH", "La carga terminó antes del tamaño declarado.", {
        status: 422,
        details: { expectedBytes: operation.size, receivedBytes },
      });
      const uploaded = await stat(operation.partialPath);
      assertStudio(uploaded.isFile() && uploaded.size === operation.size, "UPLOAD_SIZE_MISMATCH", "El temporal no coincide con la carga declarada.", { status: 422 });
      await rename(operation.partialPath, operation.completedPath);
      operation.state = "importing";

      if (operation.replace && operation.id) {
        await this.history?.snapshot?.(`content/media/${operation.id}.json`, {
          reason: "before-media-import",
          skipIfDuplicate: false,
        });
      }
      let result;
      try {
        result = await this.importer({
          inputPath: operation.completedPath,
          kind: operation.kind,
          id: operation.id,
          page: operation.page,
          repoRoot: this.root,
          originalsDir: this.originalsDirectory,
          replace: operation.replace,
          metadata: operation.metadata,
        });
      } catch (error) {
        throw mediaErrorToStudio(error);
      }
      const manifestPath = path.relative(this.root, result.manifestPath).split(path.sep).join("/");
      const masterPath = path.relative(this.root, result.masterPath).split(path.sep).join("/");
      assertStudio(!manifestPath.startsWith("../") && !masterPath.startsWith("../"), "MEDIA_OUTPUT_OUTSIDE_REPOSITORY", "El importador generó una salida fuera del repositorio.", { status: 500 });
      return {
        ok: true,
        id: result.manifest.id,
        manifestPath,
        masterPath,
        manifest: result.manifest,
        warnings: result.manifest.warnings ?? [],
      };
    } catch (error) {
      throw mediaErrorToStudio(error);
    } finally {
      this.operations.delete(operation.uploadId);
      await rm(operation.operationDirectory, { recursive: true, force: true }).catch(() => {});
    }
  }

  async prune() {
    if (this.pruning) return;
    this.pruning = true;
    try {
      const now = this.now();
      const expired = [...this.operations.values()].filter((operation) => operation.state === "pending" && operation.expiresAt <= now);
      for (const operation of expired) {
        this.operations.delete(operation.uploadId);
        await rm(operation.operationDirectory, { recursive: true, force: true });
      }
    } finally {
      this.pruning = false;
    }
  }

  stats() {
    return {
      pending: [...this.operations.values()].filter((operation) => operation.state === "pending").length,
      active: [...this.operations.values()].filter((operation) => operation.state !== "pending").length,
      maximumPending: this.maximumPendingUploads,
    };
  }

  async close() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const operations = [...this.operations.values()];
    this.operations.clear();
    for (const operation of operations) await rm(operation.operationDirectory, { recursive: true, force: true }).catch(() => {});
  }
}

export const mediaUploadLimits = Object.freeze({
  rasterBytes: MEDIA_LIMITS.rasterBytes,
  tiffBytes: MEDIA_LIMITS.tiffBytes,
  pdfBytes: MEDIA_LIMITS.pdfBytes,
  pendingOperations: MAX_PENDING_UPLOADS,
});
