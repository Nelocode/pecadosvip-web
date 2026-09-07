import { resolve } from 'node:path';

import sharp from 'sharp';

const auditDirectory = resolve('output/audit-20260831-filigree-harmonized');
const sourcePath = resolve('assets/brand/filigree-mosaic-source-v04.png');

const beforeRestPath = resolve(auditDirectory, 'before-home-rest-1280x720.png');
const beforeHoverPath = resolve(
  auditDirectory,
  'before-home-hover-left-1280x720-v2.png',
);
const finalRestPath = resolve(auditDirectory, 'home-final-rest-1280x720.png');
const finalHoverPath = resolve(
  auditDirectory,
  'home-final-hover-left-1280x720.png',
);
const finalServicesPath = resolve(
  auditDirectory,
  'services-final-hover-left-1280x720.png',
);

const gap = 12;
const fullPanelWidth = 480;
const fullPanelHeight = 270;
const fullComparisonOutput = resolve(
  auditDirectory,
  'comparison-before-after-home.png',
);

const fullPanels = await Promise.all(
  [beforeRestPath, beforeHoverPath, finalRestPath, finalHoverPath].map((path) =>
    sharp(path)
      .resize(fullPanelWidth, fullPanelHeight, { fit: 'cover' })
      .png()
      .toBuffer(),
  ),
);

await sharp({
  create: {
    width: fullPanelWidth * fullPanels.length + gap * (fullPanels.length - 1),
    height: fullPanelHeight,
    channels: 3,
    background: '#050505',
  },
})
  .composite(
    fullPanels.map((input, index) => ({
      input,
      left: index * (fullPanelWidth + gap),
      top: 0,
    })),
  )
  .png()
  .toFile(fullComparisonOutput);

const focusWidth = 240;
const focusHeight = 520;
const sourceFocus = await sharp(sourcePath)
  .extract({ left: 0, top: 0, width: 380, height: 1254 })
  .resize(focusWidth, focusHeight, { fit: 'cover' })
  .png()
  .toBuffer();
const implementationFocusPanels = await Promise.all(
  [
    beforeRestPath,
    beforeHoverPath,
    finalRestPath,
    finalHoverPath,
    finalServicesPath,
  ].map((path) =>
    sharp(path)
      .extract({ left: 0, top: 100, width: 120, height: 520 })
      .resize(focusWidth, focusHeight, { fit: 'fill' })
      .png()
      .toBuffer(),
  ),
);
const focusPanels = [sourceFocus, ...implementationFocusPanels];
const focusComparisonOutput = resolve(
  auditDirectory,
  'comparison-focus-source-before-after-services.png',
);

await sharp({
  create: {
    width: focusWidth * focusPanels.length + gap * (focusPanels.length - 1),
    height: focusHeight,
    channels: 3,
    background: '#050505',
  },
})
  .composite(
    focusPanels.map((input, index) => ({
      input,
      left: index * (focusWidth + gap),
      top: 0,
    })),
  )
  .png()
  .toFile(focusComparisonOutput);

process.stdout.write(
  `${JSON.stringify({ fullComparisonOutput, focusComparisonOutput })}\n`,
);
