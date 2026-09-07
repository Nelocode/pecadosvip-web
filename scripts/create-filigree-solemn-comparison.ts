import { resolve } from 'node:path';

import sharp from 'sharp';

const auditDirectory = resolve('output/audit-20260831-filigree-solemn-gold');
const sourcePath = resolve('assets/brand/filigree-mosaic-source-v04.png');
const restPath = resolve(auditDirectory, 'home-final-rest-1280x720.png');
const hoverPath = resolve(auditDirectory, 'home-final-hover-left-1280x720.png');
const servicesPath = resolve(
  auditDirectory,
  'services-final-hover-left-1280x720.png',
);

const overviewOutput = resolve(
  auditDirectory,
  'comparison-source-rest-hover-services.png',
);
const focusOutput = resolve(
  auditDirectory,
  'comparison-left-rail-source-rest-hover-services.png',
);
const panelHeight = 360;
const sourceWidth = 360;
const implementationWidth = 520;
const gap = 12;

const sourceOverview = await sharp(sourcePath)
  .resize(sourceWidth, panelHeight, { fit: 'cover' })
  .png()
  .toBuffer();
const implementationPanels = await Promise.all(
  [restPath, hoverPath, servicesPath].map((path) =>
    sharp(path)
      .resize(implementationWidth, panelHeight, { fit: 'cover' })
      .png()
      .toBuffer(),
  ),
);

await sharp({
  create: {
    width: sourceWidth + implementationWidth * 3 + gap * 3,
    height: panelHeight,
    channels: 3,
    background: '#050505',
  },
})
  .composite([
    { input: sourceOverview, left: 0, top: 0 },
    ...implementationPanels.map((input, index) => ({
      input,
      left: sourceWidth + gap + index * (implementationWidth + gap),
      top: 0,
    })),
  ])
  .png()
  .toFile(overviewOutput);

const focusHeight = 528;
const focusWidth = 280;
const sourceFocus = await sharp(sourcePath)
  .extract({ left: 0, top: 0, width: 380, height: 1254 })
  .resize(focusWidth, focusHeight, { fit: 'cover' })
  .png()
  .toBuffer();
const implementationFocusPanels = await Promise.all(
  [restPath, hoverPath, servicesPath].map((path) =>
    sharp(path)
      .extract({ left: 0, top: 92, width: 112, height: 528 })
      .resize(focusWidth, focusHeight, { fit: 'fill' })
      .png()
      .toBuffer(),
  ),
);

await sharp({
  create: {
    width: focusWidth * 4 + gap * 3,
    height: focusHeight,
    channels: 3,
    background: '#050505',
  },
})
  .composite(
    [sourceFocus, ...implementationFocusPanels].map((input, index) => ({
      input,
      left: index * (focusWidth + gap),
      top: 0,
    })),
  )
  .png()
  .toFile(focusOutput);

process.stdout.write(`${JSON.stringify({ overviewOutput, focusOutput })}\n`);
