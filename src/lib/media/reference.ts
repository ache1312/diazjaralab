import { isMediaManifest } from './manifest.ts';
import type {
  MediaAssetId,
  MediaKind,
  MediaManifest,
  MediaReference,
  TinaMediaDocumentReference,
} from './types.ts';

const MEDIA_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const TINA_MEDIA_REFERENCE_PATTERN = /^content\/media\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/u;

type UnknownRecord = Record<string, unknown>;

export type MediaReferenceErrorCode =
  | 'MEDIA_REFERENCE_INVALID'
  | 'MEDIA_REFERENCE_MISSING'
  | 'MEDIA_REFERENCE_DUPLICATE'
  | 'MEDIA_KIND_MISMATCH';

export class MediaReferenceError extends Error {
  readonly code: MediaReferenceErrorCode;

  constructor(code: MediaReferenceErrorCode, message: string) {
    super(message);
    this.name = 'MediaReferenceError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function idFromString(value: string): MediaAssetId | undefined {
  const normalized = value.trim().replaceAll('\\', '/');
  if (MEDIA_ID_PATTERN.test(normalized)) return normalized;
  return TINA_MEDIA_REFERENCE_PATTERN.exec(normalized)?.[1];
}

/**
 * Normalizes the three values a page may receive for a selected medium:
 * a stable manifest ID, Tina's persisted document path, or the referenced
 * manifest object returned by Tina GraphQL. Arbitrary URLs and filesystem
 * paths are deliberately rejected.
 */
export function mediaReferenceId(reference: unknown): MediaAssetId {
  if (typeof reference === 'string') {
    const id = idFromString(reference);
    if (id) return id;
  }

  if (isRecord(reference)) {
    for (const candidate of [reference.id, reference.custom_id]) {
      if (typeof candidate === 'string') {
        const id = idFromString(candidate);
        if (id) return id;
      }
    }

    const system = reference._sys;
    if (isRecord(system) && typeof system.path === 'string') {
      const id = idFromString(system.path);
      if (id) return id;
    }
  }

  throw new MediaReferenceError(
    'MEDIA_REFERENCE_INVALID',
    'La referencia debe ser un ID de medio o una relación de Tina dentro de content/media.',
  );
}

export function tinaMediaReference(id: MediaAssetId): TinaMediaDocumentReference {
  const normalized = mediaReferenceId(id);
  return `content/media/${normalized}.json`;
}

export function createMediaAssetIndex(
  manifests: readonly unknown[],
): ReadonlyMap<MediaAssetId, MediaManifest> {
  const index = new Map<MediaAssetId, MediaManifest>();
  for (const candidate of manifests) {
    if (!isMediaManifest(candidate)) {
      throw new MediaReferenceError(
        'MEDIA_REFERENCE_INVALID',
        'El catálogo contiene un manifiesto de medios inválido.',
      );
    }
    if (index.has(candidate.id)) {
      throw new MediaReferenceError(
        'MEDIA_REFERENCE_DUPLICATE',
        `El ID de medio «${candidate.id}» está duplicado.`,
      );
    }
    index.set(candidate.id, candidate);
  }
  return index;
}

export function resolveMediaManifest(
  reference: MediaReference | unknown,
  assets: ReadonlyMap<MediaAssetId, MediaManifest> | readonly MediaManifest[],
): MediaManifest {
  const id = mediaReferenceId(reference);
  const index: ReadonlyMap<MediaAssetId, MediaManifest> = Array.isArray(assets)
    ? createMediaAssetIndex(assets)
    : assets as ReadonlyMap<MediaAssetId, MediaManifest>;
  const manifest = index.get(id);
  if (!manifest) {
    throw new MediaReferenceError(
      'MEDIA_REFERENCE_MISSING',
      `No existe un medio registrado con el ID «${id}».`,
    );
  }
  return manifest;
}

export function assertMediaKind(
  manifest: MediaManifest,
  allowedKinds: readonly MediaKind[],
): void {
  if (!allowedKinds.includes(manifest.kind)) {
    throw new MediaReferenceError(
      'MEDIA_KIND_MISMATCH',
      `El medio «${manifest.id}» es ${manifest.kind} y no corresponde al uso solicitado.`,
    );
  }
}
