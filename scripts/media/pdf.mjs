import { mediaError } from './errors.mjs';

const ACTIVE_PDF_FEATURES = [
  /\/JavaScript\b/i,
  /\/JS\b/i,
  /\/Launch\b/i,
  /\/EmbeddedFile\b/i,
  /\/OpenAction\b/i,
  /\/AA\b/i,
];

export function inspectPdf(buffer) {
  const text = buffer.toString('latin1');
  const tail = text.slice(-4096);

  if (!/^%PDF-(?:1\.[0-7]|2\.0)/.test(text.slice(0, 16))) {
    throw mediaError('PDF_HEADER_INVALID', 'La cabecera PDF no es válida o usa una versión no reconocida.');
  }
  if (!/%%EOF\s*$/.test(tail)) {
    throw mediaError('PDF_TRUNCATED', 'El PDF parece truncado: no se encontró un cierre %%EOF válido.');
  }
  const startXrefMatch = tail.match(/startxref\s+(\d+)\s+%%EOF\s*$/s);
  if (!startXrefMatch) {
    throw mediaError('PDF_XREF_INVALID', 'No fue posible validar la tabla de referencias del PDF.');
  }
  const xrefOffset = Number(startXrefMatch[1]);
  const xrefFragment = text.slice(xrefOffset, xrefOffset + 1024);
  const classicXref = xrefFragment.startsWith('xref');
  const streamXref = /^\d+\s+\d+\s+obj\b[\s\S]{0,900}\/Type\s*\/XRef\b/.test(xrefFragment);
  if (!Number.isSafeInteger(xrefOffset) || xrefOffset < 0 || xrefOffset >= buffer.length || (!classicXref && !streamXref)) {
    throw mediaError('PDF_XREF_INVALID', 'startxref no apunta a una estructura xref válida dentro del PDF.');
  }
  if (/\/Encrypt\b/i.test(text)) {
    throw mediaError('PDF_ENCRYPTED', 'Los PDF cifrados o protegidos por contraseña no se pueden publicar.');
  }
  if (ACTIVE_PDF_FEATURES.some((pattern) => pattern.test(text))) {
    throw mediaError(
      'PDF_ACTIVE_CONTENT',
      'El PDF contiene JavaScript, adjuntos o acciones automáticas. Exporte una copia estática antes de publicarlo.',
    );
  }

  const pageCount = [...text.matchAll(/\/Type\s*\/Page(?!s)\b/g)].length;
  if (pageCount < 1) {
    throw mediaError(
      'PDF_PAGES_UNVERIFIED',
      'No fue posible verificar las páginas del PDF. Reexpórtelo como PDF estándar sin objetos comprimidos.',
    );
  }

  const mediaBoxMatch = text.match(
    /\/MediaBox\s*\[\s*([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s*\]/,
  );
  if (!mediaBoxMatch) {
    throw mediaError('PDF_DIMENSIONS_UNVERIFIED', 'No fue posible verificar las dimensiones de página del PDF.');
  }

  const coordinates = mediaBoxMatch.slice(1).map(Number);
  const widthPoints = Math.abs(coordinates[2] - coordinates[0]);
  const heightPoints = Math.abs(coordinates[3] - coordinates[1]);
  if (
    !Number.isFinite(widthPoints) ||
    !Number.isFinite(heightPoints) ||
    widthPoints <= 0 ||
    heightPoints <= 0 ||
    widthPoints > 14_400 ||
    heightPoints > 14_400
  ) {
    throw mediaError('PDF_DIMENSIONS_INVALID', 'El PDF declara dimensiones de página inválidas o excesivas.');
  }

  return { pageCount, widthPoints, heightPoints };
}
