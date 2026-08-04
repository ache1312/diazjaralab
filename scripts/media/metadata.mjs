import { ALL_MEDIA_KINDS, IMAGE_KINDS, LOCALIZED_FIELDS } from './constants.mjs';
import { mediaError } from './errors.mjs';

function cleanText(value, fieldName, locale) {
  if (typeof value !== 'string') {
    throw mediaError('METADATA_REQUIRED', `Falta ${fieldName}.${locale}.`);
  }
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) throw mediaError('METADATA_REQUIRED', `Falta ${fieldName}.${locale}.`);
  if (cleaned.length > 1200) {
    throw mediaError('METADATA_TOO_LONG', `${fieldName}.${locale} supera los 1200 caracteres.`);
  }
  return cleaned;
}

export function validateKind(kind, family) {
  if (!ALL_MEDIA_KINDS.includes(kind)) {
    throw mediaError('KIND_INVALID', `Tipo editorial inválido: ${kind ?? '(vacío)'}.`);
  }
  if (family === 'document' && kind !== 'document') {
    throw mediaError('KIND_FORMAT_MISMATCH', 'Los PDF deben importarse con --kind document.');
  }
  if (family === 'raster' && !IMAGE_KINDS.includes(kind)) {
    throw mediaError('KIND_FORMAT_MISMATCH', 'Las imágenes requieren micrograph, photograph, figure o logo.');
  }
  return kind;
}

export function validateEditorialMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    throw mediaError('METADATA_REQUIRED', 'Se requieren metadatos editoriales bilingües.');
  }

  const normalized = {};
  for (const field of LOCALIZED_FIELDS) {
    const localized = metadata[field];
    if (!localized || typeof localized !== 'object') {
      throw mediaError('METADATA_REQUIRED', `Falta el campo bilingüe ${field}.`);
    }
    normalized[field] = {
      es: cleanText(localized.es, field, 'es'),
      en: cleanText(localized.en, field, 'en'),
    };
  }
  return normalized;
}

export function assertManifestHasNoAbsolutePaths(value, keyPath = 'manifest') {
  if (typeof value === 'string') {
    const windowsAbsolute = /^[a-zA-Z]:[\\/]/.test(value) || /^\\\\/.test(value);
    if (value.startsWith('/') || windowsAbsolute) {
      throw mediaError('ABSOLUTE_PATH_IN_MANIFEST', `Se detectó una ruta absoluta en ${keyPath}.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertManifestHasNoAbsolutePaths(item, `${keyPath}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      assertManifestHasNoAbsolutePaths(item, `${keyPath}.${key}`);
    }
  }
}

