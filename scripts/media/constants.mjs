export const MEBIBYTE = 1024 * 1024;

export const MEDIA_LIMITS = Object.freeze({
  rasterBytes: 250 * MEBIBYTE,
  tiffBytes: 250 * MEBIBYTE,
  pdfBytes: 25 * MEBIBYTE,
  publicFileBytes: 25 * MEBIBYTE,
  inputPixels: 200_000_000,
  maxDimension: 50_000,
  maxFrames: 500,
});

export const IMAGE_KINDS = Object.freeze([
  'micrograph',
  'photograph',
  'figure',
  'logo',
]);

export const ALL_MEDIA_KINDS = Object.freeze([...IMAGE_KINDS, 'document']);

export const FORMAT_INFO = Object.freeze({
  jpeg: { extension: 'jpg', mimeType: 'image/jpeg', family: 'raster' },
  png: { extension: 'png', mimeType: 'image/png', family: 'raster' },
  webp: { extension: 'webp', mimeType: 'image/webp', family: 'raster' },
  avif: { extension: 'avif', mimeType: 'image/avif', family: 'raster' },
  gif: { extension: 'gif', mimeType: 'image/gif', family: 'raster' },
  tiff: { extension: 'tiff', mimeType: 'image/tiff', family: 'raster' },
  pdf: { extension: 'pdf', mimeType: 'application/pdf', family: 'document' },
});

export const LOCALIZED_FIELDS = Object.freeze([
  'alt',
  'caption',
  'credit',
  'technique',
  'provenance',
]);

