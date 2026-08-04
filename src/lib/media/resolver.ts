import type { ImageMetadata } from 'astro';
import type { Locale } from '../../content-data/types.ts';
import {
  assertMediaKind,
  createMediaAssetIndex,
  mediaReferenceId,
  resolveMediaManifest,
} from './reference.ts';
import type {
  DocumentMediaManifest,
  ImageMediaManifest,
  MediaAssetId,
  MediaKind,
  MediaManifest,
  MediaReference,
} from './types.ts';

const IMAGE_ASSET_PREFIX = '../../assets/';

export type MediaDeliveryErrorCode =
  | 'MEDIA_ARCHIVED'
  | 'MEDIA_NOT_READY'
  | 'MEDIA_MASTER_MISSING'
  | 'MEDIA_MASTER_INVALID';

export class MediaDeliveryError extends Error {
  readonly code: MediaDeliveryErrorCode;

  constructor(code: MediaDeliveryErrorCode, message: string) {
    super(message);
    this.name = 'MediaDeliveryError';
    this.code = code;
  }
}

interface ResolvedEditorialMetadata {
  readonly alt: string;
  readonly caption: string;
  readonly credit: string;
  readonly technique: string;
  readonly provenance: string;
}

interface ResolvedMediaBase extends ResolvedEditorialMetadata {
  readonly id: MediaAssetId;
  readonly kind: MediaKind;
  readonly manifest: MediaManifest;
  readonly url: string;
}

export interface ResolvedImageMedia extends ResolvedMediaBase {
  readonly type: 'image';
  readonly kind: Exclude<MediaKind, 'document'>;
  readonly manifest: ImageMediaManifest;
  /** Pass this value directly to Astro's `<Image src={...}>`. */
  readonly image: ImageMetadata;
  readonly width: number;
  readonly height: number;
  readonly objectPosition: string;
}

export interface ResolvedDocumentMedia extends ResolvedMediaBase {
  readonly type: 'document';
  readonly kind: 'document';
  readonly manifest: DocumentMediaManifest;
  /** Public, same-origin URL suitable for an `<a href>`. */
  readonly href: string;
  readonly pageCount: number;
}

export type ResolvedMediaAsset = ResolvedImageMedia | ResolvedDocumentMedia;

export interface ResolveMediaOptions {
  readonly locale?: Locale;
  readonly allowedKinds?: readonly MediaKind[];
  readonly allowArchived?: boolean;
}

function isImageMetadata(value: unknown): value is ImageMetadata {
  return typeof value === 'object'
    && value !== null
    && typeof (value as ImageMetadata).src === 'string'
    && Number.isInteger((value as ImageMetadata).width)
    && Number.isInteger((value as ImageMetadata).height);
}

function repositoryPathForImageModule(key: string): string | undefined {
  const normalized = key.replaceAll('\\', '/');
  if (!normalized.startsWith(IMAGE_ASSET_PREFIX)) return undefined;
  return `src/assets/${normalized.slice(IMAGE_ASSET_PREFIX.length)}`;
}

function localizedEditorial(manifest: MediaManifest, locale: Locale): ResolvedEditorialMetadata {
  const fallbackLocale: Locale = locale === 'es' ? 'en' : 'es';
  const field = (name: keyof MediaManifest['editorial']): string =>
    manifest.editorial[name][locale].trim() || manifest.editorial[name][fallbackLocale].trim();
  return {
    alt: field('alt'),
    caption: field('caption'),
    credit: field('credit'),
    technique: field('technique'),
    provenance: field('provenance'),
  };
}

function documentPublicUrl(manifest: DocumentMediaManifest): string {
  const prefix = 'public/media/documents/';
  if (!manifest.master.path.startsWith(prefix) || !manifest.master.path.endsWith('.pdf')) {
    throw new MediaDeliveryError(
      'MEDIA_MASTER_INVALID',
      `El PDF «${manifest.id}» no tiene una ruta pública válida.`,
    );
  }
  const filename = manifest.master.path.slice(prefix.length);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*--[a-f0-9]{12}\.pdf$/u.test(filename)) {
    throw new MediaDeliveryError(
      'MEDIA_MASTER_INVALID',
      `El PDF «${manifest.id}» no tiene un nombre público seguro.`,
    );
  }
  return `/media/documents/${filename}`;
}

export function createMediaResolver(
  manifests: readonly unknown[],
  imageModules: Readonly<Record<string, unknown>>,
) {
  const assetIndex = createMediaAssetIndex(manifests);
  const imageIndex = new Map<string, ImageMetadata>();
  for (const [key, candidate] of Object.entries(imageModules)) {
    const repositoryPath = repositoryPathForImageModule(key);
    if (repositoryPath && isImageMetadata(candidate)) imageIndex.set(repositoryPath, candidate);
  }

  const resolve = (
    reference: MediaReference | unknown,
    options: ResolveMediaOptions = {},
  ): ResolvedMediaAsset => {
    const manifest = resolveMediaManifest(reference, assetIndex);
    if (manifest.status === 'archived' && !options.allowArchived) {
      throw new MediaDeliveryError(
        'MEDIA_ARCHIVED',
        `El medio «${manifest.id}» está archivado y no puede mostrarse.`,
      );
    }
    if (
      manifest.status === 'review'
      || (manifest.status === 'metadata-pending' && manifest.preservation.policy !== 'legacy-unverified')
    ) {
      throw new MediaDeliveryError(
        'MEDIA_NOT_READY',
        `El medio «${manifest.id}» todavía requiere revisión editorial antes de publicarse.`,
      );
    }
    if (options.allowedKinds) assertMediaKind(manifest, options.allowedKinds);
    const locale = options.locale ?? 'es';
    const editorial = localizedEditorial(manifest, locale);

    if (manifest.kind === 'document') {
      const href = documentPublicUrl(manifest);
      return {
        ...editorial,
        id: manifest.id,
        kind: manifest.kind,
        type: 'document',
        manifest,
        url: href,
        href,
        pageCount: manifest.master.pageCount,
      };
    }

    const image = imageIndex.get(manifest.master.path);
    if (!image) {
      throw new MediaDeliveryError(
        'MEDIA_MASTER_MISSING',
        `No se encontró el máster web compilable de «${manifest.id}».`,
      );
    }
    return {
      ...editorial,
      id: manifest.id,
      kind: manifest.kind,
      type: 'image',
      manifest,
      image,
      url: image.src,
      width: manifest.master.width,
      height: manifest.master.height,
      objectPosition: `${manifest.focalPoint.x}% ${manifest.focalPoint.y}%`,
    };
  };

  return {
    ids: Object.freeze([...assetIndex.keys()]),
    manifests: Object.freeze([...assetIndex.values()]),
    resolve,
    tryResolve(
      reference: MediaReference | unknown,
      options: ResolveMediaOptions = {},
    ): ResolvedMediaAsset | undefined {
      try {
        return resolve(reference, options);
      } catch {
        return undefined;
      }
    },
    has(reference: MediaReference | unknown): boolean {
      try {
        return assetIndex.has(mediaReferenceId(reference));
      } catch {
        return false;
      }
    },
  };
}

// Vite/Astro expands these literal globs at build time. `import.meta.env` is
// available in both dev and prerendered bundles, while plain Node leaves it
// undefined; that keeps the factory importable by the unit tests without
// accidentally disabling the generated module map during `astro build`.
const hasViteEnvironment = typeof import.meta.env !== 'undefined';
const manifestModules = hasViteEnvironment
  ? import.meta.glob<MediaManifest>('../../../content/media/*.json', {
      eager: true,
      import: 'default',
    })
  : {};

const imageModules = hasViteEnvironment
  ? import.meta.glob<ImageMetadata>([
      '../../assets/media/**/*.{jpg,jpeg,png,webp,avif,gif}',
      '../../assets/images/**/*.{jpg,jpeg,png,webp,avif,gif}',
    ], {
      eager: true,
      import: 'default',
    })
  : {};

const defaultResolver = createMediaResolver(Object.values(manifestModules), imageModules);

export const mediaAssetIds = defaultResolver.ids;
export const mediaManifests = defaultResolver.manifests;
export const resolveMediaAsset = defaultResolver.resolve;
export const tryResolveMediaAsset = defaultResolver.tryResolve;
export const hasMediaAsset = defaultResolver.has;
