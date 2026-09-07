import { resolve } from 'node:path';

import sharp from 'sharp';

const previousComparison = resolve(
  'output/design-qa/services-reference-vs-implementation.png',
);
const implementation = resolve(
  'output/design-qa/services-unique-catalog-desktop.png',
);
const output = resolve(
  'output/design-qa/services-reference-vs-implementation-unique.png',
);

const source = await sharp(previousComparison)
  .extract({ left: 0, top: 0, width: 1024, height: 800 })
  .resize({ height: 1000 })
  .png()
  .toBuffer();
const implementationImage = await sharp(implementation)
  .resize({ height: 1000 })
  .png()
  .toBuffer();
const sourceMetadata = await sharp(source).metadata();
const implementationMetadata = await sharp(implementationImage).metadata();
const gap = 24;

if (!sourceMetadata.width || !implementationMetadata.width) {
  throw new Error('Could not determine comparison image widths.');
}

await sharp({
  create: {
    width: sourceMetadata.width + implementationMetadata.width + gap,
    height: 1000,
    channels: 3,
    background: '#050505',
  },
})
  .composite([
    { input: source, left: 0, top: 0 },
    {
      input: implementationImage,
      left: sourceMetadata.width + gap,
      top: 0,
    },
  ])
  .png()
  .toFile(output);

console.log(output);
