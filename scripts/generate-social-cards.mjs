#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const brandDir = path.join(projectRoot, 'public', 'brand');
const logoPath = path.join(projectRoot, 'brand-assets', 'lab-mark-original-transparent-master.png');
const settingsPath = path.join(projectRoot, 'content', 'settings', 'site.json');
const settings = JSON.parse(await readFile(settingsPath, 'utf8'));

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO_WIDTH = 452;

const themes = {
  dark: {
    background: '#081820',
    foreground: '#edf5f2',
    muted: '#a9bfbc',
    accent: '#69d0bb',
    grid: '#dcefed',
    divider: '#8eb5af',
    logo: '#d9f1ec',
  },
  light: {
    background: '#f6f4ee',
    foreground: '#0a1c2e',
    muted: '#40596b',
    accent: '#0f806c',
    grid: '#0a1c2e',
    divider: '#315169',
    logo: null,
  },
};

const copy = {
  es: {
    title: ['Laboratorio de', 'Neurodinámica', 'Respiratoria'],
    description: ['Respiración, circuitos cerebrales', 'y enfermedad.'],
  },
  en: {
    title: ['Respiratory', 'Neurodynamics', 'Laboratory'],
    description: ['Breathing, brain circuits,', 'and disease.'],
  },
};

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function cardSvg(locale, themeName) {
  const theme = themes[themeName];
  const localized = copy[locale];
  const brandName = settings.brand.name[locale];
  const gridOpacity = themeName === 'dark' ? 0.035 : 0.04;
  const dividerOpacity = themeName === 'dark' ? 0.22 : 0.19;

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <defs>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="${theme.grid}" stroke-width="1" opacity="${gridOpacity}"/>
        </pattern>
      </defs>

      <rect width="${WIDTH}" height="${HEIGHT}" fill="${theme.background}"/>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>

      <line x1="558" y1="72" x2="558" y2="558" stroke="${theme.divider}" stroke-width="1" opacity="${dividerOpacity}"/>
      <line x1="616" y1="137" x2="1128" y2="137" stroke="${theme.accent}" stroke-width="3"/>

      <text x="616" y="111" fill="${theme.accent}" font-family="'Source Sans 3', 'Ubuntu Sans', Arial, sans-serif" font-size="28" font-weight="720" letter-spacing="1.2">${escapeXml(brandName)}</text>

      ${localized.title.map((line, index) => `
        <text x="612" y="${218 + index * 68}" fill="${theme.foreground}" font-family="'Source Sans 3', 'Ubuntu Sans', Arial, sans-serif" font-size="58" font-weight="720" letter-spacing="-1.2">${escapeXml(line)}</text>
      `).join('')}

      ${localized.description.map((line, index) => `
        <text x="616" y="${444 + index * 31}" fill="${theme.muted}" font-family="'Source Sans 3', 'Ubuntu Sans', Arial, sans-serif" font-size="24" font-weight="520">${escapeXml(line)}</text>
      `).join('')}

      <text x="616" y="551" fill="${theme.foreground}" font-family="'Source Sans 3', 'Ubuntu Sans', Arial, sans-serif" font-size="20" font-weight="650" letter-spacing="2.1">DIAZJARALAB.COM</text>
      <circle cx="1128" cy="545" r="5" fill="${theme.accent}"/>
    </svg>
  `);
}

async function prepareLogo(themeName) {
  const resized = await sharp(logoPath)
    .resize({ width: LOGO_WIDTH, kernel: sharp.kernel.lanczos3, withoutEnlargement: true })
    .sharpen({ sigma: 0.45 })
    .png()
    .toBuffer();

  const tint = themes[themeName].logo;
  if (!tint) return resized;

  const { width, height } = await sharp(resized).metadata();
  const alpha = await sharp(resized).ensureAlpha().extractChannel('alpha').png().toBuffer();
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: tint,
    },
  })
    .joinChannel(alpha)
    .png()
    .toBuffer();
}

for (const themeName of Object.keys(themes)) {
  const logo = await prepareLogo(themeName);
  const logoMetadata = await sharp(logo).metadata();
  const logoTop = Math.round((HEIGHT - logoMetadata.height) / 2);

  for (const locale of Object.keys(copy)) {
    const filename = `og-default-${themeName}-${locale}-v2.png`;
    const outputPath = path.join(brandDir, filename);
    await sharp(cardSvg(locale, themeName))
      .composite([{ input: logo, left: 62, top: logoTop }])
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outputPath);

    const metadata = await sharp(outputPath).metadata();
    if (metadata.width !== WIDTH || metadata.height !== HEIGHT || metadata.format !== 'png') {
      throw new Error(`${filename} was generated with unexpected metadata.`);
    }
    console.log(`Generated public/brand/${filename} (${metadata.width}×${metadata.height})`);
  }
}
