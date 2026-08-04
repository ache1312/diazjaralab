import { mediaError } from './errors.mjs';

function startsWithBytes(buffer, bytes) {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

function ascii(buffer, start, end) {
  return buffer.subarray(start, Math.min(end, buffer.length)).toString('ascii');
}

function isAvif(buffer) {
  if (buffer.length < 16 || ascii(buffer, 4, 8) !== 'ftyp') return false;
  const brands = ascii(buffer, 8, Math.min(buffer.length, 64));
  return /avif|avis/.test(brands);
}

function looksLikeVideo(buffer) {
  if (startsWithBytes(buffer, [0x1a, 0x45, 0xdf, 0xa3])) return true;
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'AVI ') return true;
  if (startsWithBytes(buffer, [0x00, 0x00, 0x01, 0xba])) return true;
  if (buffer.length >= 12 && ascii(buffer, 4, 8) === 'ftyp') {
    const brands = ascii(buffer, 8, Math.min(buffer.length, 64));
    return !/avif|avis/.test(brands);
  }
  return false;
}

function looksLikeSvg(buffer) {
  const prefix = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('utf8');
  return /^\s*(?:<\?xml[^>]*>\s*)?(?:<!doctype[^>]*>\s*)?<svg[\s>]/i.test(prefix);
}

export function detectMediaFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    throw mediaError('EMPTY_OR_TRUNCATED', 'El archivo está vacío o demasiado truncado para identificarlo.');
  }

  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP') return 'webp';
  if (ascii(buffer, 0, 6) === 'GIF87a' || ascii(buffer, 0, 6) === 'GIF89a') return 'gif';
  if (isAvif(buffer)) return 'avif';
  if (
    startsWithBytes(buffer, [0x49, 0x49, 0x2a, 0x00]) ||
    startsWithBytes(buffer, [0x4d, 0x4d, 0x00, 0x2a]) ||
    startsWithBytes(buffer, [0x49, 0x49, 0x2b, 0x00]) ||
    startsWithBytes(buffer, [0x4d, 0x4d, 0x00, 0x2b])
  ) {
    return 'tiff';
  }
  if (ascii(buffer, 0, 5) === '%PDF-') return 'pdf';

  if (looksLikeVideo(buffer)) {
    throw mediaError(
      'VIDEO_UNSUPPORTED',
      'El video no está admitido en esta versión. Publíquelo mediante una plataforma externa y enlace su URL.',
    );
  }
  if (looksLikeSvg(buffer)) {
    throw mediaError(
      'SVG_UNSUPPORTED',
      'Los SVG se reservan para logos revisados y sanitizados; el importador científico no los acepta todavía. Use PNG o WebP.',
    );
  }

  throw mediaError(
    'FORMAT_UNSUPPORTED',
    'Formato no compatible. Use JPEG, PNG, WebP, AVIF, GIF, TIFF o PDF.',
  );
}

