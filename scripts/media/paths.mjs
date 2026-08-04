import os from 'node:os';
import path from 'node:path';
import { mediaError } from './errors.mjs';

const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function safeSlug(value, fallback = 'media') {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');

  if (!slug || WINDOWS_RESERVED.test(slug)) return fallback;
  return slug;
}

export function isPathInside(parentPath, candidatePath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function findOneDriveAncestor(candidate) {
  const resolved = path.resolve(candidate);
  const parsed = path.parse(resolved);
  const relative = resolved.slice(parsed.root.length);
  const segments = relative.split(path.sep).filter(Boolean);
  const index = segments.findIndex((segment) => /^onedrive(?:\s*[-_].+)?$/i.test(segment));
  if (index === -1) return undefined;
  return path.join(parsed.root, ...segments.slice(0, index + 1));
}

export function resolveOriginalsDirectory({
  configured,
  repoRoot = process.cwd(),
  env = process.env,
  homeDirectory = os.homedir(),
} = {}) {
  const explicit = configured || env.LAB_MEDIA_ORIGINALS_DIR;
  const oneDriveEnvironment = env.OneDrive || env.OneDriveConsumer || env.OneDriveCommercial;
  const oneDriveRoot = oneDriveEnvironment || findOneDriveAncestor(repoRoot) || path.join(homeDirectory, 'OneDrive');
  const resolved = path.resolve(explicit || path.join(oneDriveRoot, 'DiazJaraLab-media-originals'));

  if (isPathInside(repoRoot, resolved)) {
    throw mediaError(
      'ORIGINALS_INSIDE_REPOSITORY',
      'La carpeta de originales debe estar fuera del repositorio Git. Configure LAB_MEDIA_ORIGINALS_DIR con una carpeta local de OneDrive.',
    );
  }
  return resolved;
}

export function toRepositoryPath(repoRoot, absolutePath) {
  const relative = path.relative(path.resolve(repoRoot), path.resolve(absolutePath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw mediaError('PATH_OUTSIDE_REPOSITORY', 'El recurso público debe permanecer dentro del repositorio.');
  }
  return relative.split(path.sep).join('/');
}

