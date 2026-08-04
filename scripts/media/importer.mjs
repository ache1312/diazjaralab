import { createHash, randomBytes } from 'node:crypto';
import {
  constants as fsConstants,
  copyFile,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { FORMAT_INFO, MEDIA_LIMITS } from './constants.mjs';
import { MediaImportError, mediaError } from './errors.mjs';
import { assertManifestHasNoAbsolutePaths, validateEditorialMetadata, validateKind } from './metadata.mjs';
import { inspectPdf } from './pdf.mjs';
import { isPathInside, resolveOriginalsDirectory, safeSlug, toRepositoryPath } from './paths.mjs';
import { detectMediaFormat } from './signature.mjs';

const TIFF_REJECTION_MARKERS = [
  '<ome xmlns=',
  'schemas/ome/',
  'ome.xsd',
  'openmicroscopy',
  'openslide',
  'aperio',
  'hamamatsu',
  'leica scn',
  'philips dpu',
  'whole slide',
  'whole-slide',
  'isyntax',
  'mirax',
];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function sha256File(filePath) {
  return sha256(await readFile(filePath));
}

function findTiffRejectionMarker(buffer) {
  const chunkSize = 1024 * 1024;
  const overlapLength = Math.max(...TIFF_REJECTION_MARKERS.map((marker) => marker.length)) - 1;
  let overlap = '';
  for (let offset = 0; offset < buffer.length; offset += chunkSize) {
    const chunk = `${overlap}${buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length)).toString('latin1')}`.toLowerCase();
    const marker = TIFF_REJECTION_MARKERS.find((candidate) => chunk.includes(candidate));
    if (marker) return marker;
    overlap = chunk.slice(-overlapLength);
  }
  return undefined;
}

function rejectSpecializedTiff(buffer) {
  const marker = findTiffRejectionMarker(buffer);
  if (marker) {
    throw mediaError(
      'SPECIALIZED_TIFF_UNSUPPORTED',
      'Se detectó OME-TIFF o una imagen whole-slide. Exporte una página o región como TIFF simple antes de importarla.',
      { marker },
    );
  }
}

function rejectPyramidalTiff(metadata) {
  if ((metadata.subifds ?? 0) > 0 || (metadata.levels?.length ?? 0) > 1) {
    throw mediaError(
      'PYRAMIDAL_TIFF_UNSUPPORTED',
      'El TIFF contiene pirámides o subimágenes propias de whole-slide. Exporte una región como TIFF simple.',
    );
  }
}

function assertImageDimensions(metadata, countAllPages = true) {
  const width = metadata.width;
  const height = metadata.pageHeight || metadata.height;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw mediaError('DIMENSIONS_INVALID', 'No fue posible obtener dimensiones raster válidas.');
  }
  if (width > MEDIA_LIMITS.maxDimension || height > MEDIA_LIMITS.maxDimension) {
    throw mediaError(
      'DIMENSIONS_EXCESSIVE',
      `La imagen supera ${MEDIA_LIMITS.maxDimension.toLocaleString('es-CL')} px por lado y parece ser whole-slide. Exporte una región.`,
    );
  }
  if (width * height > MEDIA_LIMITS.inputPixels) {
    throw mediaError(
      'PIXELS_EXCESSIVE',
      `La imagen supera ${MEDIA_LIMITS.inputPixels.toLocaleString('es-CL')} píxeles. Exporte una región científica representativa.`,
    );
  }
  const pages = metadata.pages ?? 1;
  if (!Number.isInteger(pages) || pages < 1 || pages > MEDIA_LIMITS.maxFrames) {
    throw mediaError('PAGE_COUNT_EXCESSIVE', `El archivo declara una cantidad de páginas o cuadros no admitida (${pages}).`);
  }
  if (countAllPages && pages > 1 && width * height * pages > MEDIA_LIMITS.inputPixels) {
    throw mediaError(
      'ANIMATION_PIXELS_EXCESSIVE',
      'La suma de píxeles de todos los cuadros es excesiva. Exporte una animación web más pequeña.',
    );
  }
  return { width, height, pages };
}

function normalizeSelectedPage(format, page, totalPages) {
  if (format !== 'tiff') {
    if (page !== undefined) {
      throw mediaError('PAGE_NOT_APPLICABLE', '--page solo puede usarse con TIFF.');
    }
    return undefined;
  }

  if (totalPages > 1 && page === undefined) {
    throw mediaError(
      'TIFF_PAGE_REQUIRED',
      `El TIFF contiene ${totalPages} páginas. Indique una página entre 1 y ${totalPages} con --page.`,
    );
  }

  const selected = page ?? 1;
  if (!Number.isInteger(selected) || selected < 1 || selected > totalPages) {
    throw mediaError('TIFF_PAGE_INVALID', `La página TIFF debe estar entre 1 y ${totalPages}.`);
  }
  return selected;
}

function sharpInputOptions(format, selectedPage, animated) {
  return {
    failOn: 'warning',
    limitInputPixels: MEDIA_LIMITS.inputPixels,
    limitInputChannels: 5,
    sequentialRead: true,
    ...(format === 'tiff' ? { page: selectedPage - 1, pages: 1 } : {}),
    ...(animated ? { animated: true } : {}),
  };
}

async function inspectRaster(buffer, format, page) {
  if (format === 'tiff') rejectSpecializedTiff(buffer);
  let metadata;
  try {
    metadata = await sharp(buffer, {
      failOn: 'warning',
      limitInputPixels: MEDIA_LIMITS.inputPixels,
      limitInputChannels: 5,
      sequentialRead: true,
    }).metadata();
  } catch (error) {
    throw mediaError('RASTER_DECODE_FAILED', `Sharp no pudo decodificar el archivo ${format.toUpperCase()}.`, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  const expectedSharpFormat = format === 'avif' ? 'heif' : format;
  if (metadata.format !== expectedSharpFormat) {
    throw mediaError(
      'SIGNATURE_DECODE_MISMATCH',
      `La firma indica ${format}, pero el decodificador identificó ${metadata.format ?? 'un formato desconocido'}.`,
    );
  }

  if (format === 'tiff') rejectPyramidalTiff(metadata);
  const dimensions = assertImageDimensions(metadata, format !== 'tiff');
  const selectedPage = normalizeSelectedPage(format, page, dimensions.pages);

  return {
    metadata,
    ...dimensions,
    selectedPage,
    animated: format !== 'tiff' && dimensions.pages > 1,
  };
}

function masterFormatFor(kind, animated) {
  if (animated || kind === 'photograph') {
    return { format: 'webp', extension: 'webp', mimeType: 'image/webp' };
  }
  return { format: 'png', extension: 'png', mimeType: 'image/png' };
}

function assertScienceEncodingCanRemainLossless(metadata, kind) {
  if (kind === 'photograph') return;
  const losslessSpaces = new Set(['b-w', 'grey16', 'rgb', 'rgb16', 'srgb']);
  const losslessDepths = new Set(['uchar', 'ushort']);
  if (!losslessSpaces.has(metadata.space) || !losslessDepths.has(metadata.depth)) {
    throw mediaError(
      'SCIENTIFIC_ENCODING_UNSUPPORTED',
      `La imagen usa ${metadata.space}/${metadata.depth}, que no puede convertirse a web sin alterar valores. Exporte una copia RGB o escala de grises de 8/16 bits sin aplicar LUT.`,
    );
  }
}

async function createRasterMaster({ buffer, format, inspection, kind, temporaryPath }) {
  assertScienceEncodingCanRemainLossless(inspection.metadata, kind);
  const masterFormat = masterFormatFor(kind, inspection.animated);
  const inputOptions = sharpInputOptions(format, inspection.selectedPage, inspection.animated);
  let pipeline = sharp(buffer, inputOptions);

  // Preserve only the source colour profile. EXIF/IPTC/XMP are intentionally not copied.
  // No rotate, resize, crop, normalize, gamma, sharpen, LUT or colourspace operation is used.
  if (inspection.metadata.hasProfile) pipeline = pipeline.keepIccProfile();

  if (masterFormat.format === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false });
  } else if (inspection.animated || kind !== 'photograph') {
    pipeline = pipeline.webp({ lossless: true, effort: 5 });
  } else {
    pipeline = pipeline.webp({ quality: 92, alphaQuality: 100, smartSubsample: false, effort: 5 });
  }

  try {
    await pipeline.toFile(temporaryPath);
  } catch (error) {
    throw mediaError('RASTER_DECODE_FAILED', 'No fue posible decodificar y normalizar la imagen completa.', {
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  const outputMetadata = await sharp(temporaryPath, {
    failOn: 'warning',
    limitInputPixels: MEDIA_LIMITS.inputPixels,
    animated: inspection.animated,
  }).metadata();
  const outputHeight = outputMetadata.pageHeight || outputMetadata.height;
  if (outputMetadata.width !== inspection.width || outputHeight !== inspection.height) {
    throw mediaError(
      'MASTER_DIMENSIONS_CHANGED',
      'La normalización alteró las dimensiones; el recurso se descartó para proteger la evidencia científica.',
    );
  }
  if (inspection.animated && outputMetadata.pages !== inspection.pages) {
    throw mediaError('MASTER_FRAMES_CHANGED', 'La normalización alteró la cantidad de cuadros de la imagen animada.');
  }

  return {
    ...masterFormat,
    width: inspection.width,
    height: inspection.height,
    pages: inspection.animated ? inspection.pages : 1,
    hasAlpha: outputMetadata.hasAlpha,
  };
}

async function ensureOriginal(buffer, destinationPath, expectedHash) {
  await mkdir(path.dirname(destinationPath), { recursive: true });
  try {
    await writeFile(destinationPath, buffer, { flag: 'wx' });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const existingHash = await sha256File(destinationPath);
    if (existingHash !== expectedHash) {
      throw mediaError(
        'ORIGINAL_HASH_COLLISION',
        'Existe un original distinto bajo la misma clave de integridad. No se modificó ningún archivo.',
      );
    }
  }
}

async function installGeneratedFile(temporaryPath, destinationPath) {
  await mkdir(path.dirname(destinationPath), { recursive: true });
  try {
    await copyFile(temporaryPath, destinationPath, fsConstants.COPYFILE_EXCL);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const [temporaryHash, existingHash] = await Promise.all([
      sha256File(temporaryPath),
      sha256File(destinationPath),
    ]);
    if (temporaryHash !== existingHash) {
      throw mediaError(
        'MASTER_COLLISION',
        'Ya existe un máster diferente con el mismo nombre. Cambie el ID editorial o revise el repositorio.',
      );
    }
  }
}

async function installManifest(manifestPath, manifest, replace) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  try {
    await stat(manifestPath);
    if (!replace) {
      throw mediaError(
        'MANIFEST_EXISTS',
        `Ya existe el recurso ${manifest.id}. Use --replace solo después de revisar el cambio.`,
      );
    }
  } catch (error) {
    if (error instanceof MediaImportError) throw error;
    if (error?.code !== 'ENOENT') throw error;
  }

  const temporaryPath = `${manifestPath}.tmp-${process.pid}-${randomBytes(5).toString('hex')}`;
  const backupPath = `${manifestPath}.bak-${process.pid}-${randomBytes(5).toString('hex')}`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  try {
    if (replace) {
      try {
        await rename(manifestPath, backupPath);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    await rename(temporaryPath, manifestPath);
    await rm(backupPath, { force: true });
  } catch (error) {
    await rm(temporaryPath, { force: true });
    try {
      await rename(backupPath, manifestPath);
    } catch (restoreError) {
      if (restoreError?.code !== 'ENOENT') throw restoreError;
    }
    throw error;
  }
}

async function assertManifestAvailable(manifestPath, replace) {
  try {
    await stat(manifestPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  if (!replace) {
    throw mediaError(
      'MANIFEST_EXISTS',
      `Ya existe el recurso ${path.basename(manifestPath, '.json')}. Use --replace solo después de revisar el cambio.`,
    );
  }
}

function normalizeImportedAt(now) {
  const value = typeof now === 'function' ? now() : (now ?? new Date());
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw mediaError('DATE_INVALID', 'La fecha de importación no es válida.');
  return date.toISOString();
}

function assertSize(format, byteLength) {
  const limit = format === 'pdf'
    ? MEDIA_LIMITS.pdfBytes
    : format === 'tiff'
      ? MEDIA_LIMITS.tiffBytes
      : MEDIA_LIMITS.rasterBytes;
  if (byteLength > limit) {
    const megabytes = Math.round(limit / (1024 * 1024));
    throw mediaError('FILE_TOO_LARGE', `El archivo supera el máximo permitido de ${megabytes} MB para ${format.toUpperCase()}.`);
  }
}

export async function inspectMediaFile(inputPath, { page } = {}) {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    throw mediaError('INPUT_REQUIRED', 'Indique el archivo que desea importar.');
  }
  let resolvedInput;
  try {
    resolvedInput = await realpath(path.resolve(inputPath));
  } catch {
    throw mediaError('INPUT_NOT_FOUND', `No se encontró el archivo: ${inputPath}`);
  }
  const inputStat = await stat(resolvedInput);
  if (!inputStat.isFile()) throw mediaError('INPUT_NOT_FILE', 'La ruta de entrada debe apuntar a un archivo regular.');

  // Read only after checking the declared size, then verify again to reduce TOCTOU surprises.
  if (inputStat.size > MEDIA_LIMITS.rasterBytes) {
    throw mediaError('FILE_TOO_LARGE', 'El archivo supera el máximo absoluto de 250 MB.');
  }
  const buffer = await readFile(resolvedInput);
  if (buffer.length !== inputStat.size) {
    throw mediaError('INPUT_CHANGED', 'El archivo cambió mientras era leído. Intente importarlo nuevamente.');
  }
  const format = detectMediaFormat(buffer);
  assertSize(format, buffer.length);

  if (format === 'tiff' && /(?:\.ome\.tiff?|\.svs|\.ndpi|\.mrxs|\.scn|\.bif|\.qptiff)$/i.test(resolvedInput)) {
    throw mediaError(
      'SPECIALIZED_TIFF_UNSUPPORTED',
      'La extensión corresponde a OME-TIFF o whole-slide. Exporte una página o región como TIFF simple.',
    );
  }

  if (format === 'pdf') {
    if (page !== undefined) throw mediaError('PAGE_NOT_APPLICABLE', '--page solo puede usarse con TIFF.');
    return {
      inputPath: resolvedInput,
      buffer,
      format,
      family: 'document',
      byteLength: buffer.length,
      sha256: sha256(buffer),
      document: inspectPdf(buffer),
    };
  }

  return {
    inputPath: resolvedInput,
    buffer,
    format,
    family: 'raster',
    byteLength: buffer.length,
    sha256: sha256(buffer),
    image: await inspectRaster(buffer, format, page),
  };
}

export async function importMedia(options = {}) {
  const requestedRepoRoot = path.resolve(options.repoRoot ?? process.cwd());
  let repoRoot;
  try {
    repoRoot = await realpath(requestedRepoRoot);
  } catch {
    throw mediaError('REPOSITORY_NOT_FOUND', `No se encontró la raíz del repositorio: ${requestedRepoRoot}`);
  }
  try {
    await stat(path.join(repoRoot, '.git'));
  } catch {
    throw mediaError('REPOSITORY_NOT_FOUND', 'La carpeta indicada no es la raíz de un repositorio Git.');
  }
  const inspected = await inspectMediaFile(options.inputPath, { page: options.page });
  const formatInfo = FORMAT_INFO[inspected.format];
  const kind = validateKind(options.kind, inspected.family);
  const editorial = validateEditorialMetadata(options.metadata);
  const sourceStem = path.parse(inspected.inputPath).name;
  const baseId = safeSlug(options.id || sourceStem);
  const id = options.id ? baseId : `${baseId}-${inspected.sha256.slice(0, 8)}`;
  const requestedOriginalsDirectory = resolveOriginalsDirectory({
    configured: options.originalsDir,
    repoRoot,
    env: options.env,
    homeDirectory: options.homeDirectory,
  });
  await mkdir(requestedOriginalsDirectory, { recursive: true });
  const originalsDirectory = await realpath(requestedOriginalsDirectory);
  if (isPathInside(repoRoot, originalsDirectory)) {
    throw mediaError(
      'ORIGINALS_INSIDE_REPOSITORY',
      'La carpeta real de originales está dentro del repositorio Git. Configure una carpeta externa de OneDrive.',
    );
  }
  const originalStorageKey = `${inspected.sha256.slice(0, 2)}/${inspected.sha256}.${formatInfo.extension}`;
  const originalPath = path.join(originalsDirectory, ...originalStorageKey.split('/'));
  // Raster masters are compiled by Astro so they remain under src/assets.
  // Validated PDFs are copied byte-for-byte to public for same-origin delivery;
  // they must never pass through Astro's image pipeline.
  let masterDirectory = path.resolve(
    inspected.family === 'document'
      ? path.join(repoRoot, 'public/media/documents')
      : (options.masterDirectory ?? path.join(repoRoot, 'src/assets/media')),
  );
  let manifestDirectory = path.resolve(options.manifestDirectory ?? path.join(repoRoot, 'content/media'));
  if (!isPathInside(repoRoot, masterDirectory) || !isPathInside(repoRoot, manifestDirectory)) {
    throw mediaError('OUTPUT_OUTSIDE_REPOSITORY', 'Los másters y manifiestos deben escribirse dentro del repositorio.');
  }
  const warnings = [];

  await Promise.all([
    mkdir(masterDirectory, { recursive: true }),
    mkdir(manifestDirectory, { recursive: true }),
  ]);
  [masterDirectory, manifestDirectory] = await Promise.all([
    realpath(masterDirectory),
    realpath(manifestDirectory),
  ]);
  if (!isPathInside(repoRoot, masterDirectory) || !isPathInside(repoRoot, manifestDirectory)) {
    throw mediaError('OUTPUT_OUTSIDE_REPOSITORY', 'Una carpeta de salida enlazada apunta fuera del repositorio.');
  }
  const manifestPath = path.join(manifestDirectory, `${id}.json`);
  await assertManifestAvailable(manifestPath, options.replace === true);
  const temporaryMasterPath = path.join(
    masterDirectory,
    `.tmp-${process.pid}-${randomBytes(6).toString('hex')}`,
  );

  let master;
  try {
    if (inspected.family === 'document') {
      await writeFile(temporaryMasterPath, inspected.buffer, { flag: 'wx' });
      master = {
        format: 'pdf',
        extension: 'pdf',
        mimeType: 'application/pdf',
        pageCount: inspected.document.pageCount,
        widthPoints: inspected.document.widthPoints,
        heightPoints: inspected.document.heightPoints,
      };
    } else {
      master = await createRasterMaster({
        buffer: inspected.buffer,
        format: inspected.format,
        inspection: inspected.image,
        kind,
        temporaryPath: temporaryMasterPath,
      });
    }

    const masterName = `${id}--${inspected.sha256.slice(0, 12)}.${master.extension}`;
    const masterPath = path.join(masterDirectory, masterName);
    const masterStat = await stat(temporaryMasterPath);
    if (masterStat.size > MEDIA_LIMITS.publicFileBytes) {
      warnings.push({
        code: 'PUBLIC_FILE_LARGE',
        message: 'El máster supera 25 MB. La validación de publicación puede exigir una exportación web más pequeña.',
      });
    }

    const manifest = {
      schemaVersion: 1,
      id,
      kind,
      source: {
        format: inspected.format,
        mimeType: formatInfo.mimeType,
        byteLength: inspected.byteLength,
        sha256: inspected.sha256,
        originalStoredLocally: true,
        storageKey: originalStorageKey,
        ...(inspected.family === 'raster' && inspected.format === 'tiff'
          ? {
              selectedPage: inspected.image.selectedPage,
              totalPages: inspected.image.pages,
            }
          : {}),
      },
      master: {
        path: toRepositoryPath(repoRoot, masterPath),
        format: master.format,
        mimeType: master.mimeType,
        byteLength: masterStat.size,
        ...(inspected.family === 'document'
          ? {
              pageCount: master.pageCount,
              widthPoints: master.widthPoints,
              heightPoints: master.heightPoints,
            }
          : {
              width: master.width,
              height: master.height,
              pages: master.pages,
              hasAlpha: master.hasAlpha,
            }),
      },
      status: 'review',
      focalPoint: { x: 50, y: 50 },
      editorial,
      preservation: {
        policy: inspected.family === 'document'
          ? 'byte-for-byte-copy'
          : kind === 'photograph'
            ? 'dimensions-preserved-web-encoding'
            : 'lossless-pixels-no-geometric-or-colour-operations',
        sourceIccProfilePreserved: inspected.family === 'raster' && inspected.image.metadata.hasProfile,
        operations: inspected.family === 'document'
          ? ['structural-validation', 'copy']
          : [
              ...(inspected.format === 'tiff' ? [`select-page:${inspected.image.selectedPage}`] : []),
              'decode',
              `encode:${master.format}`,
            ],
      },
      importedAt: normalizeImportedAt(options.now),
      warnings,
    };

    assertManifestHasNoAbsolutePaths(manifest);
    await ensureOriginal(inspected.buffer, originalPath, inspected.sha256);
    await installGeneratedFile(temporaryMasterPath, masterPath);
    await installManifest(manifestPath, manifest, options.replace === true);

    return {
      manifest,
      manifestPath,
      masterPath,
      originalsDirectory,
      originalPath,
    };
  } finally {
    await rm(temporaryMasterPath, { force: true });
  }
}

export { MediaImportError } from './errors.mjs';
export { detectMediaFormat } from './signature.mjs';
export { resolveOriginalsDirectory, safeSlug } from './paths.mjs';
