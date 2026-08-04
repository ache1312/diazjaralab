# Servicio editorial local

Este directorio contiene la parte privilegiada del editor. Solo escucha en
`127.0.0.1:4322`; no forma parte del build estático ni debe exponerse en
GitHub Pages.

## Inicio y cierre

- `npm run edit` debe ejecutar `node scripts/studio/start.mjs`.
- `start.mjs` inicia primero la API y después el binario local `tinacms` con
  Astro en el puerto 4321.
- `Editar sitio.cmd` inicia ese comando desde WSL, espera `/admin/` y abre el
  navegador.
- `Cerrar editor.cmd` usa `stop.mjs`; este lee la credencial efímera desde
  `.git/studio-session.json` y solicita un cierre coordinado.

La API usa exclusivamente módulos incluidos en Node.js 24. TinaCMS es una
dependencia de la capa visual, no del servicio Git. Git debe estar disponible
en `PATH` y las credenciales de GitHub deben estar configuradas fuera de la
aplicación (SSH o el credential manager del equipo).

## Sesión y límites de seguridad

`GET /health` es el único endpoint operativo sin credencial. Un frontend
servido desde `http://localhost:4321` o `http://127.0.0.1:4321` obtiene la
credencial efímera con `GET /api/session` y la envía como
`Authorization: Bearer <token>`. La sesión cambia en cada inicio y su archivo
local tiene permisos `0600`.

Todas las mutaciones requieren JSON, tienen un máximo de 256 KiB y aceptan
solo rutas de estas familias:

- `content/**`
- `src/content/**`
- `public/uploads/**`
- `src/assets/uploads/**`
- `src/assets/media/**`
- los dos JSON generados del catálogo y red de publicaciones

Se rechazan traversal, rutas absolutas, enlaces simbólicos, extensiones no
editoriales y archivos públicos mayores a 25 MB. Los procesos usan
`spawn(..., { shell: false })`; ningún endpoint acepta comandos, argumentos
Git libres ni force-push. `.studio/**`, `media-originals/**` y la carpeta
externa de originales nunca pertenecen a la allowlist Git.

## API v1

| Método y ruta | Entrada | Resultado |
|---|---|---|
| `GET /api/status` | — | HEAD, rama, remoto, cambios editoriales/ignorados e historial |
| `GET /api/history?path=...&limit=...` | ruta allowlisted | hasta 100 versiones del documento |
| `POST /api/history/restore` | `{ path, snapshotId }` | restaura después de crear una instantánea de seguridad |
| `POST /api/validate` | `{}` | ejecuta la lista fija de validaciones (`npm test` por defecto) |
| `POST /api/media/upload/prepare` | `{ filename, size, kind, page?, id?, replace?, metadata }` | valida metadatos/límite y entrega un `uploadId` temporal |
| `PUT /api/media/upload/:uploadId` | stream `application/octet-stream` | almacena en temporal, llama `importMedia` y devuelve manifest/máster |
| `POST /api/git/setup/prepare` | `{ remoteUrl, branch, authorName, authorEmail, message?, replaceRemote? }` | inspección del primer commit y `confirmationId` |
| `POST /api/git/setup/confirm` | `{ confirmationId }` | configura `origin`, crea el baseline si falta y hace el primer push |
| `POST /api/publish/prepare` | `{ message? }` | validación, diff permitido y `confirmationId` |
| `POST /api/publish/confirm` | `{ confirmationId }` | commit de contenido allowlisted y push fast-forward |
| `POST /api/publications/refresh/prepare` | `{}` | refresco y grafo en una copia temporal, resumen y `confirmationId` |
| `POST /api/publications/refresh/confirm` | `{ confirmationId }` | aplica atómicamente ambos JSON generados |
| `POST /api/shutdown` | `{}` | cierre coordinado del servidor y Tina/Astro |

`POST /api/setup-git` es un alias de compatibilidad: prepara por defecto y
confirma cuando recibe `{ action: "confirm", confirmationId }`.
`POST /api/publish` y `POST /api/publications/refresh` ofrecen el mismo patrón;
`POST /api/restore` es alias de `POST /api/history/restore` y
`POST /api/media/prepare` es alias de la reserva de medios.

### Carga de medios grandes

La reserva JSON mantiene el límite general de 256 KiB. Declara exactamente el
nombre y tamaño que el navegador enviará. Imágenes web y TIFF aceptan hasta
250 MB; PDF acepta hasta 25 MB. El stream binario puede usar `PUT` o `POST`,
requiere el mismo Bearer token y debe usar `application/octet-stream` sin
`Content-Encoding`.

Cada `uploadId` es de un solo uso y caduca a los diez minutos. Los bytes se
escriben con permisos `0600` en un nombre parcial aleatorio bajo
`.studio/uploads/`; solo después de comprobar el tamaño completo se renombran
atómicamente. A continuación se invoca directamente
`scripts/media/importer.mjs`, sin shell. La respuesta expone únicamente rutas
relativas del manifiesto y el máster; nunca revela la ruta externa de
originales. Éxito, error, caducidad, cierre y reinicio eliminan los temporales.

Los identificadores de confirmación caducan a los diez minutos. Confirmar
vuelve a comprobar HEAD, contenido y SHA remoto para impedir cambios entre la
revisión y la escritura. Si el remoto no es ancestro de HEAD se devuelve
`REMOTE_NOT_FAST_FORWARD`; nunca se intenta resolver o sobrescribir el remoto.

## Historial

El servicio revisa los documentos editoriales cada 1,5 segundos. Los blobs se
deduplican por SHA-256 en `.git/studio-history/` y se conservan como máximo 100
manifiestos por ruta. Este historial no cambia de rama, no crea commits y no se
sube a GitHub. Una restauración carga y verifica primero el blob elegido, crea
una versión de seguridad del estado actual y recién entonces escribe mediante
un reemplazo atómico.

## Pruebas

```bash
node --test tests/studio/*.test.mjs
```

Las pruebas crean repositorios y remotos bare temporales. Cubren allowlist y
symlinks, límite/restore del historial, publicación selectiva, bloqueo de
divergencias, configuración inicial, actualización bibliográfica, carga de
medios, límites 25/250 MB, limpieza y seguridad de sesión/origen. No leen ni
modifican el repositorio Git real.
