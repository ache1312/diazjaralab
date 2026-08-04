import { MEDIA_KINDS, type LocalizedMediaText, type MediaManifest } from './types.ts';

type UnknownRecord = Record<string, unknown>;

const FORMAT_MIME = Object.freeze({
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  tiff: 'image/tiff',
  pdf: 'application/pdf',
} satisfies Record<string, string>);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isLocalizedText(value: unknown): value is LocalizedMediaText {
  return isRecord(value) && typeof value.es === 'string' && typeof value.en === 'string';
}

function isSafeRelativePath(value: unknown): value is string {
  return isNonEmptyString(value)
    && !value.startsWith('/')
    && !/^[a-zA-Z]:[\\/]/.test(value)
    && !value.split(/[\\/]/).includes('..');
}

function formatMatchesMime(format: unknown, mimeType: unknown): boolean {
  return typeof format === 'string'
    && format in FORMAT_MIME
    && FORMAT_MIME[format as keyof typeof FORMAT_MIME] === mimeType;
}

function isImageMasterPath(path: string, legacy: boolean): boolean {
  if (path.startsWith('src/assets/media/')) {
    return /^src\/assets\/media\/[a-z0-9]+(?:-[a-z0-9]+)*--[a-f0-9]{12}\.(?:png|webp)$/u.test(path);
  }
  return legacy
    && /^src\/assets\/images\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:jpe?g|png|webp|avif|gif|tiff?)$/u.test(path);
}

function isDocumentMasterPath(path: string): boolean {
  return /^public\/media\/documents\/[a-z0-9]+(?:-[a-z0-9]+)*--[a-f0-9]{12}\.pdf$/u.test(path);
}

export function isMediaManifest(value: unknown): value is MediaManifest {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1 || !isNonEmptyString(value.id)) return false;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value.id)) return false;
  if (!MEDIA_KINDS.includes(value.kind as (typeof MEDIA_KINDS)[number])) return false;
  if (!isRecord(value.source) || !isRecord(value.master) || !isRecord(value.editorial)) return false;
  if (!['metadata-pending', 'review', 'ready', 'archived'].includes(String(value.status))) return false;
  if (!isRecord(value.focalPoint)
    || typeof value.focalPoint.x !== 'number'
    || typeof value.focalPoint.y !== 'number'
    || value.focalPoint.x < 0
    || value.focalPoint.x > 100
    || value.focalPoint.y < 0
    || value.focalPoint.y > 100) return false;
  if (!isRecord(value.preservation)
    || ![
      'byte-for-byte-copy',
      'dimensions-preserved-web-encoding',
      'lossless-pixels-no-geometric-or-colour-operations',
      'legacy-unverified',
    ].includes(String(value.preservation.policy))
    || typeof value.preservation.sourceIccProfilePreserved !== 'boolean'
    || !Array.isArray(value.preservation.operations)
    || !value.preservation.operations.every(isNonEmptyString)) return false;
  if (!/^[a-f0-9]{64}$/.test(String(value.source.sha256))) return false;
  if (typeof value.source.originalStoredLocally !== 'boolean') return false;
  const validStorage = value.source.originalStoredLocally
    ? isSafeRelativePath(value.source.storageKey)
    : value.source.storageKey === null;
  if (!validStorage || !isSafeRelativePath(value.master.path)) return false;
  if (!Number.isInteger(value.source.byteLength) || Number(value.source.byteLength) <= 0) return false;
  if (!Number.isInteger(value.master.byteLength) || Number(value.master.byteLength) <= 0) return false;

  for (const field of ['alt', 'caption', 'credit', 'technique', 'provenance']) {
    if (!isLocalizedText(value.editorial[field])) return false;
  }

  if (!formatMatchesMime(value.source.format, value.source.mimeType)) return false;
  if (!formatMatchesMime(value.master.format, value.master.mimeType)) return false;

  const masterPath = String(value.master.path);
  const documentPair = value.kind === 'document'
    && value.source.format === 'pdf'
    && value.master.format === 'pdf'
    && isDocumentMasterPath(masterPath);
  const imagePair = value.kind !== 'document'
    && value.source.format !== 'pdf'
    && ['jpeg', 'png', 'webp', 'avif', 'gif', 'tiff'].includes(String(value.master.format))
    && isImageMasterPath(masterPath, value.preservation.policy === 'legacy-unverified');
  return documentPair || imagePair;
}

export function assertMediaManifest(value: unknown): asserts value is MediaManifest {
  if (!isMediaManifest(value)) throw new TypeError('Manifiesto de medios inválido.');
}

export function localizedMediaText(value: LocalizedMediaText, locale: 'es' | 'en'): string {
  return value[locale];
}

export function mediaMetadataComplete(manifest: MediaManifest): boolean {
  return ['alt', 'caption', 'credit', 'technique', 'provenance'].every((field) => {
    const localized = manifest.editorial[field as keyof typeof manifest.editorial];
    return localized.es.trim().length > 0 && localized.en.trim().length > 0;
  });
}

