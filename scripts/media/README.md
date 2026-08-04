# Pipeline local de medios

Este directorio contiene el importador conservador de imágenes científicas y
documentos. No necesita servicios en la nube. Sharp/libvips valida y normaliza
los formatos raster; los PDF se validan estructuralmente y se copian sin cambios.

## Uso programático

```js
import { importMedia } from './scripts/media/importer.mjs';

await importMedia({
  inputPath: '/ruta/a/la/micrografia.tiff',
  kind: 'micrograph',
  page: 1,
  metadata: {
    alt: { es: '...', en: '...' },
    caption: { es: '...', en: '...' },
    credit: { es: '...', en: '...' },
    technique: { es: '...', en: '...' },
    provenance: { es: '...', en: '...' },
  },
});
```

La función devuelve rutas operativas para la interfaz local, pero el manifiesto
persistido nunca guarda rutas absolutas. Los originales se deduplican por SHA-256
en `LAB_MEDIA_ORIGINALS_DIR`. Si esa variable no existe, se usa una carpeta
`DiazJaraLab-media-originals` bajo el OneDrive detectado.

## CLI

```bash
node scripts/media/import-media.mjs imagen.tiff \
  --kind micrograph \
  --page 1 \
  --metadata metadata.json
```

Ejecute `node scripts/media/import-media.mjs --help` para ver todas las opciones.
El editor local debe invocar la API programática; no debe construir comandos de
shell con datos introducidos por el usuario.

## Política científica

- Micrografías y figuras: PNG o WebP lossless, sin recorte, resize,
  auto-orientación, normalización, gamma, sharpen, LUT o conversión explícita de
  espacio de color.
- Fotografías: WebP calidad 92, manteniendo dimensiones.
- TIFF multipágina: selección explícita, numerada desde 1.
- OME-TIFF, TIFF piramidal y whole-slide: rechazo y solicitud de exportar una
  región o página como TIFF simple.
- PDF: 25 MB máximo; se rechazan cifrado, JavaScript, acciones y adjuntos.
- SVG y video: fuera de esta versión.

