import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import sharp, { type SharpOverlayOptions } from 'sharp';

import {
  getSyntheticServiceMedia,
  syntheticServiceMediaKeys,
} from '../lib/preview/synthetic-service-media.ts';

const outputPath = resolve(
  'output/design-qa/services-unique-assets-contact-sheet.png',
);
const columns = 6;
const cellWidth = 240;
const imageHeight = 300;
const labelHeight = 56;
const gap = 10;
const rows = Math.ceil(syntheticServiceMediaKeys.length / columns);
const width = columns * cellWidth + (columns + 1) * gap;
const height = rows * (imageHeight + labelHeight) + (rows + 1) * gap;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

await mkdir(dirname(outputPath), { recursive: true });

const composites: SharpOverlayOptions[] = [];
for (const [index, key] of syntheticServiceMediaKeys.entries()) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const left = gap + column * (cellWidth + gap);
  const top = gap + row * (imageHeight + labelHeight + gap);
  const sourcePath = resolve(getSyntheticServiceMedia(key, 'es').sourcePath);
  const thumbnail = await sharp(sourcePath)
    .resize(cellWidth, imageHeight, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
  const label = Buffer.from(`
    <svg width="${cellWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#11100f"/>
      <text x="10" y="22" fill="#d6a752" font-size="12" font-family="Arial, sans-serif">${String(index + 1).padStart(2, '0')}</text>
      <text x="38" y="22" fill="#f4eee3" font-size="11" font-family="Arial, sans-serif">${escapeXml(key.slice(0, 28))}</text>
      <text x="38" y="40" fill="#a79f93" font-size="10" font-family="Arial, sans-serif">${escapeXml(key.slice(28))}</text>
    </svg>
  `);
  composites.push({ input: thumbnail, left, top });
  composites.push({ input: label, left, top: top + imageHeight });
}

await sharp({
  create: {
    width,
    height,
    channels: 3,
    background: '#050505',
  },
})
  .composite(composites)
  .png()
  .toFile(outputPath);

console.log(outputPath);
