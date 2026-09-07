import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  getSyntheticCityMedia,
  syntheticCityMediaSlugs,
} from '../lib/preview/synthetic-city-media.ts';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(repositoryRoot, 'output/design-qa');
const labels = {
  madrid: 'Madrid',
  barcelona: 'Barcelona',
  girona: 'Girona',
  tarragona: 'Tarragona',
  toledo: 'Toledo',
  guadalajara: 'Guadalajara',
  segovia: 'Segovia',
  sitges: 'Sitges',
} as const;

function escapedSvgText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

await mkdir(outputDirectory, { recursive: true });

const cellWidth = 360;
const imageHeight = 270;
const labelHeight = 54;
const gap = 24;
const columns = 4;
const rows = 2;
const sheetWidth = gap + columns * (cellWidth + gap);
const sheetHeight = gap + rows * (imageHeight + labelHeight + gap);
const contactComposites: Array<{
  input: Buffer;
  left: number;
  top: number;
}> = [];

for (const [index, citySlug] of syntheticCityMediaSlugs.entries()) {
  const media = getSyntheticCityMedia(citySlug, 'es');
  const left = gap + (index % columns) * (cellWidth + gap);
  const top = gap + Math.floor(index / columns) * (imageHeight + labelHeight + gap);
  const image = await sharp(resolve(repositoryRoot, media.sourcePath))
    .resize(cellWidth, imageHeight, { fit: 'cover' })
    .png()
    .toBuffer();
  const label = Buffer.from(
    `<svg width="${cellWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0b0907"/>
      <text x="16" y="34" fill="#d8ad62" font-family="Georgia, serif" font-size="22">${escapedSvgText(labels[citySlug])}</text>
    </svg>`,
  );
  contactComposites.push({ input: image, left, top });
  contactComposites.push({ input: label, left, top: top + imageHeight });
}

await sharp({
  create: {
    width: sheetWidth,
    height: sheetHeight,
    channels: 3,
    background: '#050403',
  },
})
  .composite(contactComposites)
  .png()
  .toFile(resolve(outputDirectory, 'cities-reference-contact-sheet.png'));

const beforePath = resolve(outputDirectory, 'cities-reference-before.png');
const afterPath = resolve(outputDirectory, 'cities-reference-desktop.png');
const panelWidth = 720;
const panelHeight = 500;
const titleHeight = 64;
const comparisonGap = 20;
const comparisonWidth = panelWidth * 2 + comparisonGap * 3;
const comparisonHeight = panelHeight + titleHeight + comparisonGap * 2;

const [before, after] = await Promise.all([
  sharp(await readFile(beforePath))
    .resize(panelWidth, panelHeight, { fit: 'inside' })
    .png()
    .toBuffer(),
  sharp(await readFile(afterPath))
    .resize(panelWidth, panelHeight, { fit: 'inside' })
    .png()
    .toBuffer(),
]);

const title = (label: string) => Buffer.from(
  `<svg width="${panelWidth}" height="${titleHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#0b0907"/>
    <text x="18" y="40" fill="#d8ad62" font-family="Arial, sans-serif" font-size="22" letter-spacing="2">${escapedSvgText(label)}</text>
  </svg>`,
);

const comparison = await sharp({
  create: {
    width: comparisonWidth,
    height: comparisonHeight,
    channels: 3,
    background: '#050403',
  },
})
  .composite([
    { input: title('ANTES · CONTEXTO SIN RECORTE'), left: comparisonGap, top: comparisonGap },
    { input: title('AHORA · CONTEXTO SIN RECORTE'), left: comparisonGap * 2 + panelWidth, top: comparisonGap },
    { input: before, left: comparisonGap, top: comparisonGap + titleHeight },
    { input: after, left: comparisonGap * 2 + panelWidth, top: comparisonGap + titleHeight },
  ])
  .png()
  .toBuffer();

await writeFile(
  resolve(outputDirectory, 'cities-reference-comparison.png'),
  comparison,
);

console.log('Created city contact sheet and before/after comparison.');
