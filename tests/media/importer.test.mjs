import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {
  detectMediaFormat,
  importMedia,
  inspectMediaFile,
  MediaImportError,
  resolveOriginalsDirectory,
  safeSlug,
} from '../../scripts/media/importer.mjs';
import { parseCliArguments } from '../../scripts/media/import-media.mjs';
import { isMediaManifest, mediaMetadataComplete } from '../../src/lib/media/index.ts';

const EDITORIAL = Object.freeze({
  alt: { es: 'Micrografía de prueba', en: 'Test micrograph' },
  caption: { es: 'Campo representativo.', en: 'Representative field.' },
  credit: { es: 'Laboratorio Díaz Jara', en: 'Díaz Jara Laboratory' },
  technique: { es: 'Microscopía de fluorescencia', en: 'Fluorescence microscopy' },
  provenance: { es: 'Adquisición del laboratorio', en: 'Laboratory acquisition' },
});

async function fixtureWorkspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lab-media-test-'));
  const repoRoot = path.join(root, 'repo');
  const originalsDir = path.join(root, 'OneDrive', 'originals');
  const inputs = path.join(root, 'inputs');
  await Promise.all([
    mkdir(path.join(repoRoot, '.git'), { recursive: true }),
    mkdir(inputs, { recursive: true }),
  ]);
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, repoRoot, originalsDir, inputs };
}

async function expectMediaError(action, expectedCode) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof MediaImportError);
    assert.equal(error.code, expectedCode);
    assert.ok(error.message.length > 10);
    return true;
  });
}

function allStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => allStrings(item, output));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => allStrings(item, output));
  return output;
}

function minimalPdf(extra = '') {
  const objects = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ${extra} >>
endobj
`;
  const xrefOffset = Buffer.byteLength(objects, 'latin1');
  return Buffer.from(`${objects}xref
0 4
0000000000 65535 f
trailer
<< /Root 1 0 R /Size 4 >>
startxref
${xrefOffset}
%%EOF
`, 'latin1');
}

test('detecta firmas reales y rechaza video/SVG con mensajes específicos', () => {
  assert.equal(detectMediaFormat(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'jpeg');
  assert.equal(detectMediaFormat(Buffer.from('GIF89a....')), 'gif');
  assert.equal(detectMediaFormat(Buffer.from('%PDF-1.4\n')), 'pdf');
  assert.throws(
    () => detectMediaFormat(Buffer.from('....ftypmp42isom')),
    (error) => error.code === 'VIDEO_UNSUPPORTED',
  );
  assert.throws(
    () => detectMediaFormat(Buffer.from('<?xml version="1.0"?><svg></svg>')),
    (error) => error.code === 'SVG_UNSUPPORTED',
  );
});

test('normaliza IDs seguros y ubica originales fuera de un repositorio en OneDrive', () => {
  assert.equal(safeSlug('Células GFAP / Control 01'), 'celulas-gfap-control-01');
  assert.equal(safeSlug('CON'), 'media');
  const repoRoot = path.join(os.tmpdir(), 'persona', 'OneDrive', 'sitios', 'laboratorio');
  const originals = resolveOriginalsDirectory({ repoRoot, env: {}, homeDirectory: '/otro' });
  assert.equal(originals, path.join(os.tmpdir(), 'persona', 'OneDrive', 'DiazJaraLab-media-originals'));
  assert.throws(
    () => resolveOriginalsDirectory({ configured: path.join(repoRoot, 'originales'), repoRoot }),
    (error) => error.code === 'ORIGINALS_INSIDE_REPOSITORY',
  );
});

test('importa una micrografía PNG sin alterar píxeles ni dimensiones', async (t) => {
  const workspace = await fixtureWorkspace(t);
  const inputPath = path.join(workspace.inputs, 'Células GFAP control.png');
  const pixels = Buffer.from([
    0, 20, 40, 255, 30, 60, 90, 255, 10, 50, 120, 255,
    200, 20, 10, 255, 15, 220, 30, 255, 2, 3, 240, 255,
  ]);
  await sharp(pixels, { raw: { width: 3, height: 2, channels: 4 } }).png().toFile(inputPath);

  const result = await importMedia({
    inputPath,
    repoRoot: workspace.repoRoot,
    originalsDir: workspace.originalsDir,
    kind: 'micrograph',
    metadata: EDITORIAL,
    now: '2026-08-03T12:00:00.000Z',
  });

  assert.equal(result.manifest.kind, 'micrograph');
  assert.equal(result.manifest.master.format, 'png');
  assert.equal(result.manifest.master.width, 3);
  assert.equal(result.manifest.master.height, 2);
  assert.equal(result.manifest.status, 'review');
  assert.deepEqual(result.manifest.focalPoint, { x: 50, y: 50 });
  assert.equal(result.manifest.source.originalStoredLocally, true);
  assert.equal(result.manifest.preservation.policy, 'lossless-pixels-no-geometric-or-colour-operations');
  assert.deepEqual(await readFile(result.originalPath), await readFile(inputPath));

  const sourceRaw = await sharp(inputPath).raw().toBuffer();
  const masterRaw = await sharp(result.masterPath).raw().toBuffer();
  assert.deepEqual(masterRaw, sourceRaw);

  for (const value of allStrings(result.manifest)) {
    assert.equal(path.isAbsolute(value), false, `ruta absoluta inesperada: ${value}`);
    assert.equal(/^[a-zA-Z]:[\\/]/.test(value), false, `ruta Windows inesperada: ${value}`);
  }
  assert.match(result.manifest.master.path, /^src\/assets\/media\//);
  assert.equal(JSON.parse(await readFile(result.manifestPath, 'utf8')).source.sha256.length, 64);
  assert.equal(isMediaManifest(result.manifest), true);
  assert.equal(mediaMetadataComplete(result.manifest), true);
});

test('genera WebP para fotografía y conserva sus dimensiones', async (t) => {
  const workspace = await fixtureWorkspace(t);
  const inputPath = path.join(workspace.inputs, 'Retrato del equipo.jpg');
  await sharp({ create: { width: 17, height: 11, channels: 3, background: '#496a75' } })
    .jpeg({ quality: 95 })
    .toFile(inputPath);
  const result = await importMedia({
    inputPath,
    repoRoot: workspace.repoRoot,
    originalsDir: workspace.originalsDir,
    kind: 'photograph',
    metadata: EDITORIAL,
  });
  assert.equal(result.manifest.master.format, 'webp');
  assert.equal(result.manifest.master.width, 17);
  assert.equal(result.manifest.master.height, 11);
  assert.equal((await sharp(result.masterPath).metadata()).format, 'webp');
});

test('decodifica entradas WebP, AVIF y GIF y crea másters web verificables', async (t) => {
  const workspace = await fixtureWorkspace(t);
  const fixtures = [
    {
      extension: 'webp',
      write: (target) => sharp({ create: { width: 9, height: 7, channels: 4, background: '#1f8a7099' } })
        .webp({ lossless: true }).toFile(target),
    },
    {
      extension: 'avif',
      write: (target) => sharp({ create: { width: 9, height: 7, channels: 3, background: '#593f82' } })
        .avif({ quality: 90 }).toFile(target),
    },
    {
      extension: 'gif',
      write: (target) => sharp({ create: { width: 9, height: 7, channels: 3, background: '#d07a42' } })
        .gif().toFile(target),
    },
  ];

  for (const fixture of fixtures) {
    const inputPath = path.join(workspace.inputs, `entrada-${fixture.extension}.${fixture.extension}`);
    await fixture.write(inputPath);
    const result = await importMedia({
      inputPath,
      repoRoot: workspace.repoRoot,
      originalsDir: workspace.originalsDir,
      kind: 'figure',
      metadata: EDITORIAL,
    });
    assert.equal(result.manifest.source.format, fixture.extension);
    assert.equal(result.manifest.master.width, 9);
    assert.equal(result.manifest.master.height, 7);
    assert.equal((await sharp(result.masterPath).metadata()).format, 'png');
  }
});

test('conserva todos los cuadros de un GIF animado mediante WebP lossless', async (t) => {
  const workspace = await fixtureWorkspace(t);
  const inputPath = path.join(workspace.inputs, 'secuencia.gif');
  const frameOne = Buffer.alloc(5 * 4 * 3, 25);
  const frameTwo = Buffer.alloc(5 * 4 * 3, 210);
  await sharp(Buffer.concat([frameOne, frameTwo]), {
    raw: { width: 5, height: 8, pageHeight: 4, channels: 3 },
  }).gif({ loop: 0, delay: [80, 120] }).toFile(inputPath);
  assert.equal((await sharp(inputPath).metadata()).pages, 2);

  const result = await importMedia({
    inputPath,
    repoRoot: workspace.repoRoot,
    originalsDir: workspace.originalsDir,
    kind: 'figure',
    metadata: EDITORIAL,
  });
  assert.equal(result.manifest.master.format, 'webp');
  assert.equal(result.manifest.master.pages, 2);
  assert.equal((await sharp(result.masterPath).metadata()).pages, 2);
});

test('TIFF multipágina exige selección y extrae únicamente la página elegida', async (t) => {
  const workspace = await fixtureWorkspace(t);
  const inputPath = path.join(workspace.inputs, 'serie.tiff');
  const first = Buffer.alloc(2 * 2 * 3, 15);
  const second = Buffer.alloc(2 * 2 * 3, 230);
  await sharp(Buffer.concat([first, second]), {
    raw: { width: 2, height: 4, pageHeight: 2, channels: 3 },
  }).tiff({ compression: 'none' }).toFile(inputPath);

  await expectMediaError(
    () => inspectMediaFile(inputPath),
    'TIFF_PAGE_REQUIRED',
  );
  const result = await importMedia({
    inputPath,
    repoRoot: workspace.repoRoot,
    originalsDir: workspace.originalsDir,
    kind: 'micrograph',
    page: 2,
    metadata: EDITORIAL,
  });
  assert.equal(result.manifest.source.selectedPage, 2);
  assert.equal(result.manifest.source.totalPages, 2);
  assert.equal(result.manifest.master.pages, 1);
  const selectedPixels = await sharp(result.masterPath).removeAlpha().raw().toBuffer();
  assert.ok([...selectedPixels].every((value) => value === 230));
});

test('rechaza OME/whole-slide aunque el contenedor TIFF sea decodificable', async (t) => {
  const workspace = await fixtureWorkspace(t);
  const cleanPath = path.join(workspace.inputs, 'base.tiff');
  const omePath = path.join(workspace.inputs, 'ome.tiff');
  await sharp({ create: { width: 4, height: 4, channels: 3, background: 'black' } }).tiff().toFile(cleanPath);
  const contaminated = Buffer.concat([
    await readFile(cleanPath),
    Buffer.from('<OME xmlns="http://www.openmicroscopy.org/Schemas/OME/2016-06"></OME>'),
  ]);
  await writeFile(omePath, contaminated);
  await expectMediaError(() => inspectMediaFile(omePath), 'SPECIALIZED_TIFF_UNSUPPORTED');
});

test('valida y copia PDF estático; rechaza contenido activo', async (t) => {
  const workspace = await fixtureWorkspace(t);
  const inputPath = path.join(workspace.inputs, 'protocolo.pdf');
  await writeFile(inputPath, minimalPdf());
  const result = await importMedia({
    inputPath,
    repoRoot: workspace.repoRoot,
    originalsDir: workspace.originalsDir,
    kind: 'document',
    metadata: EDITORIAL,
  });
  assert.equal(result.manifest.master.format, 'pdf');
  assert.equal(result.manifest.master.pageCount, 1);
  assert.equal(result.manifest.master.widthPoints, 612);
  assert.match(result.manifest.master.path, /^public\/media\/documents\/.+\.pdf$/u);
  assert.deepEqual(await readFile(result.masterPath), minimalPdf());

  const activePath = path.join(workspace.inputs, 'activo.pdf');
  await writeFile(activePath, minimalPdf('/OpenAction 4 0 R /JavaScript (alert)'));
  await expectMediaError(() => inspectMediaFile(activePath), 'PDF_ACTIVE_CONTENT');
});

test('aplica el límite estricto de 25 MB a PDF antes de publicarlo', async (t) => {
  const workspace = await fixtureWorkspace(t);
  const inputPath = path.join(workspace.inputs, 'demasiado-grande.pdf');
  const payload = Buffer.alloc(25 * 1024 * 1024 + 1, 0x20);
  Buffer.from('%PDF-1.4').copy(payload, 0);
  await writeFile(inputPath, payload);
  await expectMediaError(() => inspectMediaFile(inputPath), 'FILE_TOO_LARGE');
});

test('rechaza raster corrupto y exige metadatos completos', async (t) => {
  const workspace = await fixtureWorkspace(t);
  const corruptPath = path.join(workspace.inputs, 'corrupto.png');
  await writeFile(corruptPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]));
  await expectMediaError(() => inspectMediaFile(corruptPath), 'RASTER_DECODE_FAILED');

  const inputPath = path.join(workspace.inputs, 'valido.png');
  await sharp({ create: { width: 2, height: 2, channels: 3, background: 'white' } }).png().toFile(inputPath);
  await expectMediaError(
    () => importMedia({
      inputPath,
      repoRoot: workspace.repoRoot,
      originalsDir: workspace.originalsDir,
      kind: 'figure',
      metadata: { ...EDITORIAL, alt: { es: 'Descripción', en: '' } },
    }),
    'METADATA_REQUIRED',
  );
});

test('evita conversiones implícitas de color en evidencia científica', async (t) => {
  const workspace = await fixtureWorkspace(t);
  const inputPath = path.join(workspace.inputs, 'cmyk.jpg');
  await sharp({ create: { width: 3, height: 3, channels: 3, background: '#778899' } })
    .toColourspace('cmyk')
    .jpeg()
    .toFile(inputPath);
  assert.equal((await sharp(inputPath).metadata()).space, 'cmyk');
  await expectMediaError(
    () => importMedia({
      inputPath,
      repoRoot: workspace.repoRoot,
      originalsDir: workspace.originalsDir,
      kind: 'micrograph',
      metadata: EDITORIAL,
    }),
    'SCIENTIFIC_ENCODING_UNSUPPORTED',
  );
});

test('no sobrescribe manifiestos sin --replace', async (t) => {
  const workspace = await fixtureWorkspace(t);
  const inputPath = path.join(workspace.inputs, 'recurso.png');
  await sharp({ create: { width: 2, height: 2, channels: 3, background: 'white' } }).png().toFile(inputPath);
  const options = {
    inputPath,
    id: 'recurso-estable',
    repoRoot: workspace.repoRoot,
    originalsDir: workspace.originalsDir,
    kind: 'figure',
    metadata: EDITORIAL,
  };
  await importMedia(options);
  await expectMediaError(() => importMedia(options), 'MANIFEST_EXISTS');
  const replaced = await importMedia({ ...options, replace: true, metadata: {
    ...EDITORIAL,
    caption: { es: 'Leyenda revisada.', en: 'Revised caption.' },
  } });
  assert.equal(replaced.manifest.editorial.caption.es, 'Leyenda revisada.');
});

test('parser CLI mantiene selección TIFF y reemplazo explícitos', () => {
  const parsed = parseCliArguments([
    'entrada.tiff', '--kind', 'micrograph', '--page', '3', '--metadata', 'metadata.json', '--replace',
  ]);
  assert.equal(parsed.inputPath, 'entrada.tiff');
  assert.equal(parsed.kind, 'micrograph');
  assert.equal(parsed.page, 3);
  assert.equal(parsed.replace, true);
  assert.equal(parsed.metadataFile, 'metadata.json');
});

test('los manifiestos legados registrados conservan hash, tamaño y dimensiones verificables', async () => {
  const mediaDirectory = path.resolve('content/media');
  const names = (await readdir(mediaDirectory)).filter((name) => name.endsWith('.json'));
  assert.ok(names.length >= 10);

  for (const name of names) {
    const manifest = JSON.parse(await readFile(path.join(mediaDirectory, name), 'utf8'));
    assert.equal(isMediaManifest(manifest), true, `${name} no cumple MediaManifest`);
    if (manifest.preservation.policy !== 'legacy-unverified') continue;
    assert.equal(manifest.source.originalStoredLocally, false);
    assert.equal(manifest.source.storageKey, null);
    const bytes = await readFile(path.resolve(manifest.master.path));
    assert.equal(bytes.length, manifest.master.byteLength, `${name}: byteLength`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.source.sha256, `${name}: sha256`);
    if (manifest.kind !== 'document') {
      const image = await sharp(bytes).metadata();
      assert.equal(image.width, manifest.master.width, `${name}: width`);
      assert.equal(image.pageHeight || image.height, manifest.master.height, `${name}: height`);
    }
  }
});
