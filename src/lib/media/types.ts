export const MEDIA_KINDS = ['micrograph', 'photograph', 'figure', 'logo', 'document'] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];
export type MediaStatus = 'metadata-pending' | 'review' | 'ready' | 'archived';
/**
 * Stable identifier stored by hand-authored documents. Tina reference fields
 * persist a repository-relative document path instead, so consumers should
 * pass either representation to `mediaReferenceId`/`resolveMediaAsset`.
 */
export type MediaAssetId = string;
export type TinaMediaDocumentReference = `content/media/${string}.json`;
export type MediaReference = MediaAssetId | TinaMediaDocumentReference | MediaManifest;
export type ImageSourceFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff';
// New imports normalize to PNG/WebP. Other raster values remain available only
// to describe legacy assets until they are re-imported from a verified original.
export type ImageMasterFormat = ImageSourceFormat;

export interface LocalizedMediaText {
  es: string;
  en: string;
}

export interface MediaEditorialMetadata {
  alt: LocalizedMediaText;
  caption: LocalizedMediaText;
  credit: LocalizedMediaText;
  technique: LocalizedMediaText;
  provenance: LocalizedMediaText;
}

export interface MediaWarning {
  code: 'PUBLIC_FILE_LARGE' | 'ORIGINAL_NOT_ARCHIVED';
  message: string;
}

interface BaseSource {
  byteLength: number;
  sha256: string;
  originalStoredLocally: boolean;
  storageKey: string | null;
}

export interface ImageSource extends BaseSource {
  format: ImageSourceFormat;
  mimeType: `image/${string}`;
  selectedPage?: number;
  totalPages?: number;
}

export interface PdfSource extends BaseSource {
  format: 'pdf';
  mimeType: 'application/pdf';
}

export interface ImageMaster {
  path: string;
  format: ImageMasterFormat;
  mimeType: `image/${string}`;
  byteLength: number;
  width: number;
  height: number;
  pages: number;
  hasAlpha: boolean;
}

export interface PdfMaster {
  /** Static delivery path. PDF masters are never processed as Astro images. */
  path: string;
  format: 'pdf';
  mimeType: 'application/pdf';
  byteLength: number;
  pageCount: number;
  widthPoints: number;
  heightPoints: number;
}

export interface MediaPreservation {
  policy:
    | 'byte-for-byte-copy'
    | 'dimensions-preserved-web-encoding'
    | 'lossless-pixels-no-geometric-or-colour-operations'
    | 'legacy-unverified';
  sourceIccProfilePreserved: boolean;
  operations: string[];
}

interface BaseManifest {
  schemaVersion: 1;
  id: string;
  status: MediaStatus;
  focalPoint: { x: number; y: number };
  editorial: MediaEditorialMetadata;
  preservation: MediaPreservation;
  importedAt: string;
  warnings: MediaWarning[];
}

export interface ImageMediaManifest extends BaseManifest {
  kind: Exclude<MediaKind, 'document'>;
  source: ImageSource;
  master: ImageMaster;
}

export interface DocumentMediaManifest extends BaseManifest {
  kind: 'document';
  source: PdfSource;
  master: PdfMaster;
}

export type MediaManifest = ImageMediaManifest | DocumentMediaManifest;
