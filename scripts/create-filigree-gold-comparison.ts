import { resolve } from 'node:path';

import sharp from 'sharp';

const inputs = [
  resolve('output/audit-20260830-filigree-refinement/before/home-1280x720.png'),
  resolve('output/audit-20260830-filigree-gold-hover/home-dim-1280x720.png'),
  resolve(
    'output/audit-20260830-filigree-gold-hover/home-gold-left-consistent-1280x720.png',
  ),
];
const output = resolve(
  'output/audit-20260830-filigree-gold-hover/comparison-before-dim-gold.png',
);
const focusOutput = resolve(
  'output/audit-20260830-filigree-gold-hover/comparison-gold-texture-focus.png',
);
const width = 640;
const height = 360;
const gap = 12;

const images = await Promise.all(
  inputs.map((input) =>
    sharp(input).resize(width, height, { fit: 'cover' }).png().toBuffer(),
  ),
);

await sharp({
  create: {
    width: width * images.length + gap * (images.length - 1),
    height,
    channels: 3,
    background: '#050505',
  },
})
  .composite(
    images.map((input, index) => ({
      input,
      left: index * (width + gap),
      top: 0,
    })),
  )
  .png()
  .toFile(output);

const sourceFocus = await sharp(
  resolve('assets/brand/filigree-gold-texture-source-v03.png'),
)
  .extract({ left: 0, top: 125, width: 380, height: 650 })
  .resize(360, 500, { fit: 'cover' })
  .png()
  .toBuffer();
const implementationFocus = await sharp(inputs[2]!)
  .extract({ left: 0, top: 150, width: 200, height: 400 })
  .resize(360, 500, { fit: 'cover' })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 732,
    height: 500,
    channels: 3,
    background: '#050505',
  },
})
  .composite([
    { input: sourceFocus, left: 0, top: 0 },
    { input: implementationFocus, left: 372, top: 0 },
  ])
  .png()
  .toFile(focusOutput);

console.log(JSON.stringify({ output, focusOutput }));
