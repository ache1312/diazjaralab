import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createMediaAssetIndex,
  createMediaResolver,
  isMediaManifest,
  MediaDeliveryError,
  MediaReferenceError,
  mediaReferenceId,
  resolveMediaManifest,
  tinaMediaReference,
} from '../../src/lib/media/index.ts';

const imageManifest = JSON.parse(await readFile(
  new URL('../../content/media/science-rvlm-network.json', import.meta.url),
  'utf8',
));

const imageMetadata = Object.freeze({
  src: '/_astro/science-rvlm-network.hash.png',
  width: 1024,
  height: 1024,
  format: 'png',
});

function documentManifest() {
  return {
    ...structuredClone(imageManifest),
    id: 'protocolo-respiratorio',
    kind: 'document',
    status: 'ready',
    source: {
      format: 'pdf',
      mimeType: 'application/pdf',
      byteLength: 1024,
      sha256: 'a'.repeat(64),
      originalStoredLocally: true,
      storageKey: `aa/${'a'.repeat(64)}.pdf`,
    },
    master: {
      path: 'public/media/documents/protocolo-respiratorio--aaaaaaaaaaaa.pdf',
      format: 'pdf',
      mimeType: 'application/pdf',
      byteLength: 1024,
      pageCount: 4,
      widthPoints: 612,
      heightPoints: 792,
    },
    preservation: {
      policy: 'byte-for-byte-copy',
      sourceIccProfilePreserved: false,
      operations: ['structural-validation', 'copy'],
    },
  };
}

test('normaliza IDs, relaciones persistidas y objetos GraphQL de Tina', () => {
  assert.equal(mediaReferenceId('science-rvlm-network'), 'science-rvlm-network');
  assert.equal(
    mediaReferenceId('content/media/science-rvlm-network.json'),
    'science-rvlm-network',
  );
  assert.equal(mediaReferenceId({ custom_id: 'science-rvlm-network' }), 'science-rvlm-network');
  assert.equal(
    mediaReferenceId({ _sys: { path: 'content/media/science-rvlm-network.json' } }),
    'science-rvlm-network',
  );
  assert.equal(tinaMediaReference('science-rvlm-network'), 'content/media/science-rvlm-network.json');

  for (const unsafe of [
    '/etc/passwd',
    '../science-rvlm-network',
    'https://example.test/image.png',
    'content/media/unsafe.svg',
    'content/media/a/../../unsafe.json',
  ]) {
    assert.throws(
      () => mediaReferenceId(unsafe),
      (error) => error instanceof MediaReferenceError && error.code === 'MEDIA_REFERENCE_INVALID',
    );
  }
});

test('resuelve siempre contra el catálogo confiable y detecta ausencias o duplicados', () => {
  const index = createMediaAssetIndex([imageManifest]);
  assert.equal(resolveMediaManifest({ id: imageManifest.id }, index), imageManifest);
  assert.throws(
    () => resolveMediaManifest('no-existe', index),
    (error) => error instanceof MediaReferenceError && error.code === 'MEDIA_REFERENCE_MISSING',
  );
  assert.throws(
    () => createMediaAssetIndex([imageManifest, structuredClone(imageManifest)]),
    (error) => error instanceof MediaReferenceError && error.code === 'MEDIA_REFERENCE_DUPLICATE',
  );
});

test('entrega imágenes Astro y PDF públicos mediante una API discriminada', () => {
  const pdf = documentManifest();
  assert.equal(isMediaManifest(pdf), true);
  const resolver = createMediaResolver(
    [imageManifest, pdf],
    { '../../assets/images/science/rvlm-network.png': imageMetadata },
  );

  const image = resolver.resolve('content/media/science-rvlm-network.json', {
    locale: 'en',
    allowedKinds: ['micrograph'],
  });
  assert.equal(image.type, 'image');
  assert.equal(image.image, imageMetadata);
  assert.equal(image.url, imageMetadata.src);
  assert.equal(image.objectPosition, '50% 50%');
  assert.equal(image.alt, imageManifest.editorial.alt.en);

  const document = resolver.resolve({ custom_id: pdf.id }, {
    locale: 'es',
    allowedKinds: ['document'],
  });
  assert.equal(document.type, 'document');
  assert.equal(document.href, '/media/documents/protocolo-respiratorio--aaaaaaaaaaaa.pdf');
  assert.equal(document.pageCount, 4);

  assert.throws(
    () => resolver.resolve(pdf.id, { allowedKinds: ['photograph'] }),
    (error) => error instanceof MediaReferenceError && error.code === 'MEDIA_KIND_MISMATCH',
  );
});

test('no entrega archivados ni másters raster fuera del grafo de Astro', () => {
  const archived = { ...structuredClone(imageManifest), status: 'archived' };
  const archivedResolver = createMediaResolver(
    [archived],
    { '../../assets/images/science/rvlm-network.png': imageMetadata },
  );
  assert.throws(
    () => archivedResolver.resolve(archived.id),
    (error) => error instanceof MediaDeliveryError && error.code === 'MEDIA_ARCHIVED',
  );

  const review = { ...structuredClone(imageManifest), status: 'review' };
  const reviewResolver = createMediaResolver(
    [review],
    { '../../assets/images/science/rvlm-network.png': imageMetadata },
  );
  assert.throws(
    () => reviewResolver.resolve(review.id),
    (error) => error instanceof MediaDeliveryError && error.code === 'MEDIA_NOT_READY',
  );

  const missingResolver = createMediaResolver([imageManifest], {});
  assert.throws(
    () => missingResolver.resolve(imageManifest.id),
    (error) => error instanceof MediaDeliveryError && error.code === 'MEDIA_MASTER_MISSING',
  );
  assert.equal(missingResolver.tryResolve('content/media/unsafe.svg'), undefined);
});
