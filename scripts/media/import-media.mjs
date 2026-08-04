#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { importMedia, MediaImportError } from './importer.mjs';

const VALUE_FLAGS = new Set([
  '--kind',
  '--id',
  '--page',
  '--repo-root',
  '--originals-dir',
  '--metadata',
  '--alt-es',
  '--alt-en',
  '--caption-es',
  '--caption-en',
  '--credit-es',
  '--credit-en',
  '--technique-es',
  '--technique-en',
  '--provenance-es',
  '--provenance-en',
]);

const HELP = `
Importador local de medios científicos

Uso:
  node scripts/media/import-media.mjs <archivo> --kind <tipo> --metadata <metadata.json>

Tipos:
  micrograph | photograph | figure | logo | document

Opciones:
  --id <id>                 ID estable opcional (minúsculas y guiones)
  --page <n>                Página TIFF, numerada desde 1
  --originals-dir <ruta>    Carpeta externa para originales
  --repo-root <ruta>        Raíz del repositorio (por defecto: cwd)
  --replace                 Reemplaza un manifiesto existente de forma explícita
  --metadata <archivo>      JSON con alt, caption, credit, technique y provenance en es/en
  --alt-es/--alt-en ...     Alternativa a --metadata para cada campo bilingüe
  --help                    Muestra esta ayuda

Ejemplo de metadata.json:
  {
    "alt": { "es": "...", "en": "..." },
    "caption": { "es": "...", "en": "..." },
    "credit": { "es": "...", "en": "..." },
    "technique": { "es": "...", "en": "..." },
    "provenance": { "es": "...", "en": "..." }
  }

Variable de entorno:
  LAB_MEDIA_ORIGINALS_DIR   Carpeta local/OneDrive fuera del repositorio
`;

export function parseCliArguments(argv) {
  const positional = [];
  const values = new Map();
  let replace = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') return { help: true };
    if (argument === '--replace') {
      replace = true;
      continue;
    }
    if (argument.startsWith('--')) {
      if (!VALUE_FLAGS.has(argument)) throw new Error(`Opción desconocida: ${argument}`);
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`Falta el valor de ${argument}.`);
      values.set(argument, value);
      index += 1;
      continue;
    }
    positional.push(argument);
  }

  if (positional.length !== 1) throw new Error('Indique exactamente un archivo de entrada.');
  const pageValue = values.get('--page');
  const page = pageValue === undefined ? undefined : Number(pageValue);
  if (pageValue !== undefined && !Number.isInteger(page)) throw new Error('--page debe ser un número entero.');

  return {
    help: false,
    inputPath: positional[0],
    kind: values.get('--kind'),
    id: values.get('--id'),
    page,
    repoRoot: values.get('--repo-root'),
    originalsDir: values.get('--originals-dir'),
    metadataFile: values.get('--metadata'),
    replace,
    inlineMetadata: {
      alt: { es: values.get('--alt-es'), en: values.get('--alt-en') },
      caption: { es: values.get('--caption-es'), en: values.get('--caption-en') },
      credit: { es: values.get('--credit-es'), en: values.get('--credit-en') },
      technique: { es: values.get('--technique-es'), en: values.get('--technique-en') },
      provenance: { es: values.get('--provenance-es'), en: values.get('--provenance-en') },
    },
  };
}

async function readMetadata(arguments_) {
  if (!arguments_.metadataFile) return arguments_.inlineMetadata;
  let parsed;
  try {
    parsed = JSON.parse(await readFile(arguments_.metadataFile, 'utf8'));
  } catch (error) {
    throw new Error(`No fue posible leer --metadata: ${error instanceof Error ? error.message : String(error)}`);
  }
  return parsed;
}

export async function runCli(argv = process.argv.slice(2)) {
  const arguments_ = parseCliArguments(argv);
  if (arguments_.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const result = await importMedia({
    inputPath: arguments_.inputPath,
    kind: arguments_.kind,
    id: arguments_.id,
    page: arguments_.page,
    repoRoot: arguments_.repoRoot,
    originalsDir: arguments_.originalsDir,
    replace: arguments_.replace,
    metadata: await readMetadata(arguments_),
  });

  process.stdout.write(`${JSON.stringify({
    ok: true,
    id: result.manifest.id,
    manifest: result.manifestPath,
    master: result.masterPath,
    originalsDirectory: result.originalsDirectory,
    warnings: result.manifest.warnings,
  }, null, 2)}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error) => {
      const code = error instanceof MediaImportError ? error.code : 'CLI_ERROR';
      process.stderr.write(`[${code}] ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    },
  );
}

