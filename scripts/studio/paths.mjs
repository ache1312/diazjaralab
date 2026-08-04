import { lstat, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { StudioError, assertStudio } from "./errors.mjs";

const DOCUMENT_EXTENSIONS = new Set([".json", ".yaml", ".yml", ".md", ".mdx", ".txt", ".csv", ".bib"]);
const MEDIA_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".pdf"]);

export const EDITORIAL_ROOTS = Object.freeze([
  { prefix: "content/", extensions: new Set([...DOCUMENT_EXTENSIONS, ...MEDIA_EXTENSIONS]) },
  { prefix: "src/content/", extensions: new Set([...DOCUMENT_EXTENSIONS, ...MEDIA_EXTENSIONS]) },
  { prefix: "public/uploads/", extensions: MEDIA_EXTENSIONS },
  { prefix: "src/assets/uploads/", extensions: MEDIA_EXTENSIONS },
  { prefix: "src/assets/media/", extensions: MEDIA_EXTENSIONS },
]);

export const PROTECTED_GENERATED_FILES = Object.freeze([
  "src/content-data/publications.generated.json",
  "src/content-data/publication-network.generated.json",
]);

const PUBLIC_FILE_LIMIT = 25 * 1024 * 1024;

export function normalizeRelativePath(value) {
  assertStudio(typeof value === "string", "INVALID_PATH", "La ruta debe ser texto.");
  assertStudio(value.length > 0 && value.length <= 512, "INVALID_PATH", "La ruta está vacía o es demasiado larga.");
  assertStudio(!value.includes("\0") && !value.includes("\\"), "INVALID_PATH", "La ruta contiene caracteres no permitidos.");
  assertStudio(!path.posix.isAbsolute(value) && !/^[A-Za-z]:/.test(value), "INVALID_PATH", "Solo se aceptan rutas relativas.");
  const normalized = path.posix.normalize(value);
  assertStudio(
    normalized !== "." && normalized !== ".." && !normalized.startsWith("../") && normalized === value,
    "INVALID_PATH",
    "La ruta no puede salir del contenido editorial.",
  );
  return normalized;
}

export function isEditorialPath(value, { includeGenerated = true } = {}) {
  let relative;
  try {
    relative = normalizeRelativePath(value);
  } catch {
    return false;
  }

  if (includeGenerated && PROTECTED_GENERATED_FILES.includes(relative)) return true;
  const extension = path.posix.extname(relative).toLowerCase();
  return EDITORIAL_ROOTS.some((rule) => relative.startsWith(rule.prefix) && rule.extensions.has(extension));
}

export function assertEditorialPath(value, options) {
  const relative = normalizeRelativePath(value);
  if (!isEditorialPath(relative, options)) {
    throw new StudioError("PATH_NOT_ALLOWED", "La ruta no pertenece al contenido editable.", {
      status: 403,
      details: { path: relative },
    });
  }
  return relative;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

async function rejectSymlinkComponents(root, absolute, { allowMissing = false } = {}) {
  const relative = path.relative(root, absolute);
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      const info = await lstat(current);
      assertStudio(!info.isSymbolicLink(), "SYMLINK_NOT_ALLOWED", "No se permiten enlaces simbólicos en contenido editable.", {
        status: 403,
      });
    } catch (error) {
      if (error?.code === "ENOENT" && allowMissing) return;
      throw error;
    }
  }
}

export async function resolveEditorialPath(root, value, { allowMissing = false, includeGenerated = true } = {}) {
  const relative = assertEditorialPath(value, { includeGenerated });
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(absoluteRoot, ...relative.split("/"));
  assertStudio(isInside(absoluteRoot, absolute), "PATH_NOT_ALLOWED", "La ruta no pertenece al proyecto.", { status: 403 });
  await rejectSymlinkComponents(absoluteRoot, absolute, { allowMissing });

  if (!allowMissing) {
    const canonicalRoot = await realpath(absoluteRoot);
    const canonical = await realpath(absolute);
    assertStudio(isInside(canonicalRoot, canonical), "PATH_NOT_ALLOWED", "La ruta resuelta no pertenece al proyecto.", {
      status: 403,
    });
  }
  return { relative, absolute };
}

async function walk(root, directory, files) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(root, absolute, files);
    } else if (entry.isFile()) {
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (isEditorialPath(relative)) files.push(relative);
    }
  }
}

export async function listEditorialFiles(root) {
  const absoluteRoot = path.resolve(root);
  const files = [];
  for (const rule of EDITORIAL_ROOTS) {
    await walk(absoluteRoot, path.join(absoluteRoot, ...rule.prefix.slice(0, -1).split("/")), files);
  }
  for (const relative of PROTECTED_GENERATED_FILES) {
    try {
      const info = await stat(path.join(absoluteRoot, ...relative.split("/")));
      if (info.isFile()) files.push(relative);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return [...new Set(files)].sort();
}

export async function assertPublicFileSize(root, relative) {
  const { absolute } = await resolveEditorialPath(root, relative);
  const info = await stat(absolute);
  assertStudio(info.size <= PUBLIC_FILE_LIMIT, "PUBLIC_FILE_TOO_LARGE", "El archivo supera el máximo público de 25 MB.", {
    status: 422,
    details: { path: relative, bytes: info.size, maximumBytes: PUBLIC_FILE_LIMIT },
  });
  return info;
}

export const limits = Object.freeze({ publicFileBytes: PUBLIC_FILE_LIMIT });
