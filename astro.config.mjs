import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import tina from '@tinacms/astro/integration';
import { tinaAdminDevRedirect } from '@tinacms/astro/vite';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const studioMode = process.env.STUDIO_MODE === 'true';
const studioToolbarComponent = fileURLToPath(new URL(
  studioMode
    ? './src/components/studio/StudioToolbar.astro'
    : './src/components/studio/StudioToolbarDisabled.astro',
  import.meta.url,
));

const stripLocalEditorArtifacts = () => ({
  name: 'strip-local-editor-artifacts',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await rm(new URL('admin/', dir), { recursive: true, force: true });
      await rm(new URL('studio/', dir), { recursive: true, force: true });
      await rm(new URL('tina-island/', dir), { recursive: true, force: true });
    },
  },
});

export default defineConfig({
  site: process.env.SITE_URL || 'https://diazjaralab.com',
  output: studioMode ? 'server' : 'static',
  ...(studioMode ? { adapter: node({ mode: 'standalone' }) } : {}),
  trailingSlash: 'always',
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap(),
    mdx(),
    ...(studioMode ? [tina()] : []),
    stripLocalEditorArtifacts(),
  ],
  devToolbar: {
    enabled: false,
  },
  build: {
    format: 'directory',
  },
  vite: {
    resolve: {
      alias: {
        '@studio/toolbar': studioToolbarComponent,
      },
    },
    plugins: studioMode ? [tinaAdminDevRedirect()] : [],
    ...(studioMode
      ? { ssr: { noExternal: ['@tinacms/astro', '@tinacms/bridge'] } }
      : {}),
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
