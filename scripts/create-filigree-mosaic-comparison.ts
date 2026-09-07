import { resolve } from 'node:path';

import sharp from 'sharp';

const auditDirectory = resolve('output/audit-20260830-filigree-mosaic-v04');
const sourcePath = resolve('assets/brand/filigree-mosaic-source-v04.png');
const homePath = resolve(
  auditDirectory,
  'home-mosaic-subtle-hover-left-1280x720.jpg',
);
const servicesPath = resolve(
  auditDirectory,
  'services-mosaic-subtle-hover-left-1280x720.jpg',
);

const overviewOutput = resolve(
  auditDirectory,
  'comparison-subtle-source-home-services.png',
);
const focusOutput = resolve(
  auditDirectory,
  'comparison-subtle-left-rail-focus.png',
);
const panelHeight = 360;
const gap = 12;

const sourceOverview = await sharp(sourcePath)
  .resize(360, panelHeight, { fit: 'inside' })
  .png()
  .toBuffer();
const homeOverview = await sharp(homePath)
  .resize(640, panelHeight, { fit: 'cover' })
  .png()
  .toBuffer();
const servicesOverview = await sharp(servicesPath)
  .resize(640, panelHeight, { fit: 'cover' })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 360 + 640 + 640 + gap * 2,
    height: panelHeight,
    channels: 3,
    background: '#050505',
  },
})
  .composite([
    { input: sourceOverview, left: 0, top: 0 },
    { input: homeOverview, left: 360 + gap, top: 0 },
    { input: servicesOverview, left: 360 + 640 + gap * 2, top: 0 },
  ])
  .png()
  .toFile(overviewOutput);

const focusHeight = 528;
const focusWidth = 320;
const sourceFocus = await sharp(sourcePath)
  .extract({ left: 0, top: 0, width: 380, height: 1254 })
  .resize(focusWidth, focusHeight, { fit: 'cover' })
  .png()
  .toBuffer();
const homeFocus = await sharp(homePath)
  .extract({ left: 0, top: 96, width: 108, height: focusHeight })
  .resize(focusWidth, focusHeight, { fit: 'fill' })
  .png()
  .toBuffer();
const servicesFocus = await sharp(servicesPath)
  .extract({ left: 0, top: 96, width: 108, height: focusHeight })
  .resize(focusWidth, focusHeight, { fit: 'fill' })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: focusWidth * 3 + gap * 2,
    height: focusHeight,
    channels: 3,
    background: '#050505',
  },
})
  .composite([
    { input: sourceFocus, left: 0, top: 0 },
    { input: homeFocus, left: focusWidth + gap, top: 0 },
    { input: servicesFocus, left: (focusWidth + gap) * 2, top: 0 },
  ])
  .png()
  .toFile(focusOutput);

process.stdout.write(`${JSON.stringify({ overviewOutput, focusOutput })}\n`);
