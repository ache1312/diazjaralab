# Díaz-Jara Lab

Sitio web bilingüe del Laboratorio de Neurodinámica Respiratoria, generado de forma estática con Astro y desplegable en GitHub Pages.

## Editar el sitio sin programar

En Windows, haz doble clic en **`Editar sitio.cmd`**. El lanzador inicia todos los servicios locales y abre el editor en:

```text
http://localhost:4321/admin/
```

El editor permite cambiar textos, navegación, equipo, líneas de investigación, técnicas, contacto, SEO, imágenes y divulgación en español e inglés. **Editar sitio** abre la página real dentro del panel: al seleccionar un texto puedes modificarlo con contexto visual y guardar el cambio localmente. En cada página también puedes arrastrar sus bloques para reordenarlos y ocultar los opcionales; los bloques estructurales quedan protegidos.

Guarda siempre el formulario de Tina con **Save** antes de validar, restaurar o publicar. La barra inferior detecta cambios visibles que todavía no están escritos en disco y detiene esas operaciones para evitar publicar una versión anterior por accidente.

La barra inferior reúne las operaciones que no pertenecen al formulario de contenido:

- **Estado** muestra qué archivos editoriales cambiaron y permite configurar una vez el repositorio de GitHub.
- **Historial** crea y restaura copias locales del contenido antes de cambios importantes.
- **Validar** comprueba tipos, contenido y compilación antes de publicar.
- **Medios** importa fotografías y documentos con validación de tipo y tamaño. SVG no se acepta; TIFF conserva el original y genera una copia web; PDF se conserva como documento. Después de importar, revisa el registro y cámbialo a **Listo** antes de asignarlo a una página.
- **Papers** consulta actualizaciones bibliográficas y prepara una comparación sin sobrescribir el catálogo automáticamente.
- **Publicar** valida, crea un commit solo con contenido editorial y lo envía a GitHub sin `force-push`.

Para destacar, ocultar o clasificar trabajos, abre **Curaduría de publicaciones** en el menú de contenido. La publicación se elige por título, año o DOI; el orden de los trabajos destacados se cambia arrastrando la lista y el editor mantiene un máximo de cinco.

La primera publicación solicita la URL del repositorio, nombre y correo de Git, y muestra la lista de archivos que formarán la versión inicial antes de confirmar. Si la red o las credenciales fallan, vuelve a **Estado** y usa **Conectar o reintentar GitHub**. Las credenciales se administran fuera del sitio mediante Git/SSH o Git Credential Manager; el editor no guarda contraseñas ni tokens.

Para terminar, haz doble clic en **`Cerrar editor.cmd`**. Los cambios guardados permanecen en los archivos del proyecto aunque cierres el editor. La versión pública compilada no incluye Tina, la barra de edición ni las APIs locales.

Desde una terminal se pueden usar los mismos controles:

```bash
npm run edit
npm run edit:stop
```

## Desarrollo

```bash
npm install
npm run dev
```

Copiar `.env.example` a `.env` y configurar `PUBLIC_FORMSPREE_FORM_ID` para activar el formulario. Sin ese valor, el sitio conserva un enlace de contacto por email.

## Verificación

```bash
npm test
```

El comando valida TypeScript/Astro, genera las 16 rutas bilingües y comprueba enlaces, canonical y alternates de idioma.

## Publicaciones

El catálogo está versionado en `src/content-data/publications.generated.json`. Reúne el perfil público de Google Scholar con cinco identidades OpenAlex atribuidas a Esteban Díaz-Jara, deduplica por DOI/título y conserva la procedencia de cada ficha.

Para consultar cambios en OpenAlex sin modificar el repositorio:

```bash
npm run publications:refresh
```

Después de revisar manualmente los candidatos contra Google Scholar, actualizar las métricas coincidentes con:

```bash
npm run publications:refresh -- --write
```

La actualización no sobrescribe citas de Scholar ni incorpora candidatos nuevos automáticamente.

### Red bibliográfica

La visualización de publicaciones se genera de forma estática en `src/content-data/publication-network.generated.json`. Incluye artículos y revisiones, temas inferidos, referencias compartidas de OpenAlex, coautoría sin contar al autor focal y similitud de títulos. No consulta servicios externos en el navegador.

Para reconstruirla después de revisar el catálogo:

```bash
npm run publications:graph
```

El JSON conserva las referencias recuperadas. Para regenerar el layout y las aristas con esa copia local, sin consultar OpenAlex:

```bash
PUBLICATION_GRAPH_OFFLINE=1 npm run publications:graph
```

## Despliegue

El código vive en [`ache1312/diazjaralab`](https://github.com/ache1312/diazjaralab). Los pushes a `main` se validan y publican mediante GitHub Actions. Antes del lanzamiento:

1. Elegir **GitHub Actions** como fuente en **Settings → Pages**.
2. Guardar `diazjaralab.com` como dominio personalizado en Pages y verificarlo con el TXT que entregue GitHub para `_github-pages-challenge-ache1312`.
3. Reemplazar los registros `A` del apex (`@`) por los cuatro endpoints oficiales de GitHub Pages: `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`.
4. Crear `www` como `CNAME` directo a `ache1312.github.io` —sin `/diazjaralab`— para que GitHub redirija a la versión apex.
5. Activar **Enforce HTTPS** cuando el certificado esté disponible; la propagación puede tardar hasta 24 horas.
6. Definir la variable de repositorio `PUBLIC_FORMSPREE_FORM_ID` para habilitar envíos web. Sin ella, queda activo el fallback por correo.

No publicar el dominio hasta haberlo asociado y, de ser posible, verificado en GitHub; esto evita riesgos de toma de control del subdominio.
