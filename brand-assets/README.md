# Activos de identidad del Díaz–Jara Lab

Este directorio conserva los archivos maestros y las propuestas de respaldo. Ninguna imagen de `brand-assets/` se publica ni se carga en el sitio: el recurso activo y optimizado está en `public/brand/`.

## Identidad activa

- `lab-mark-original-transparent-master.png` — versión maestra del símbolo original, 768 × 689 px, con transparencia real.
- `../public/brand/lab-mark-original-transparent-optimized.webp` — derivado WebP de 384 × 345 px utilizado por la cabecera, el pie y la página 404.

Esta es la opción vigente. Mantiene el símbolo entregado por el laboratorio y elimina únicamente el fondo blanco incorporado en el archivo anterior.

## Alternativas de respaldo

- `alternatives/lab-mark-imagegen-faithful-v2.png` — reinterpretación muy cercana al símbolo actual.
- `alternatives/lab-mark-neuro-loop-v1.png` — exploración del bucle neurorespiratorio, con una lectura más sintética.
- `alternatives/lab-mark-brainstem-signal-v1.png` — exploración centrada en circuitos del tronco encefálico y señal respiratoria.

Las tres alternativas fueron creadas como material de evaluación de marca. No deben sustituir el original ni incorporarse al sitio sin aprobación explícita del cliente y una revisión posterior en tamaños pequeños, monocromo y fondos claros/oscuros.

## Tarjetas para compartir

Las tarjetas Open Graph se generan en 1200 × 630 px con el símbolo maestro mediante `npm run brand:social`.

- `public/brand/og-default-dark-es-v2.png` y `og-default-dark-en-v2.png` son las imágenes canónicas para compartir las páginas en español e inglés.
- `public/brand/og-default-light-es-v2.png` y `og-default-light-en-v2.png` conservan la adaptación clara para presentaciones y otros canales.

Las plataformas sociales no seleccionan imágenes según el modo claro u oscuro del dispositivo. Por ese motivo, el sitio declara la variante oscura como imagen principal y mantiene la clara como activo alternativo.
