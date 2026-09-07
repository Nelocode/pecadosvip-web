import { resolve } from 'node:path';

import sharp from 'sharp';

const auditDirectory = resolve('output/audit-20260831-full-background-mosaic');
const sourcePath = resolve('assets/brand/filigree-mosaic-source-v04.png');
const gap = 12;

async function createStrip(
  paths: readonly string[],
  outputName: string,
  width: number,
  height: number,
) {
  const panels = await Promise.all(
    paths.map((path) =>
      sharp(path).resize(width, height, { fit: 'cover' }).png().toBuffer(),
    ),
  );
  const output = resolve(auditDirectory, outputName);
  await sharp({
    create: {
      width: width * panels.length + gap * (panels.length - 1),
      height,
      channels: 3,
      background: '#050505',
    },
  })
    .composite(
      panels.map((input, index) => ({
        input,
        left: index * (width + gap),
        top: 0,
      })),
    )
    .png()
    .toFile(output);
  return output;
}

const overviewOutput = await createStrip(
  [
    resolve(auditDirectory, 'before-home-1280x720.png'),
    resolve(auditDirectory, 'final-home-rest-1280x720.png'),
    resolve(auditDirectory, 'home-coverage-rest-1280x720.png'),
    resolve(auditDirectory, 'final-services-rest-1280x720.png'),
  ],
  'comparison-before-after-full-background.png',
  480,
  270,
);

const interactionOutput = await createStrip(
  [
    resolve(auditDirectory, 'final-home-rest-1280x720.png'),
    resolve(auditDirectory, 'final-home-hover-1280x720.png'),
    resolve(auditDirectory, 'final-services-rest-1280x720.png'),
    resolve(auditDirectory, 'final-services-hover-1280x720.png'),
  ],
  'comparison-rest-hover-home-services.png',
  480,
  270,
);

const equivalentWidth = 591;
const equivalentHeight = 712;
const equivalentPanels = await Promise.all(
  [
    resolve(auditDirectory, 'before-home-1280x720.png'),
    resolve(auditDirectory, 'final-home-rest-1280x720.png'),
    resolve(auditDirectory, 'final-home-hover-1280x720.png'),
  ].map((path) =>
    sharp(path)
      .extract({
        left: 0,
        top: 0,
        width: equivalentWidth,
        height: equivalentHeight,
      })
      .png()
      .toBuffer(),
  ),
);
const equivalentOutput = resolve(
  auditDirectory,
  'comparison-equivalent-left-before-rest-hover.png',
);
await sharp({
  create: {
    width:
      equivalentWidth * equivalentPanels.length +
      gap * (equivalentPanels.length - 1),
    height: equivalentHeight,
    channels: 3,
    background: '#050505',
  },
})
  .composite(
    equivalentPanels.map((input, index) => ({
      input,
      left: index * (equivalentWidth + gap),
      top: 0,
    })),
  )
  .png()
  .toFile(equivalentOutput);

const sourceFocus = await sharp(sourcePath)
  .resize(360, 360, { fit: 'cover' })
  .png()
  .toBuffer();
const implementationFocus = await Promise.all(
  [
    resolve(auditDirectory, 'final-home-rest-1280x720.png'),
    resolve(auditDirectory, 'home-coverage-rest-1280x720.png'),
    resolve(auditDirectory, 'profile-sofia-rest-1280x720.png'),
    resolve(auditDirectory, 'final-services-rest-1280x720.png'),
  ].map((path) =>
    sharp(path)
      .resize(360, 360, { fit: 'cover' })
      .png()
      .toBuffer(),
  ),
);
const focusPanels = [sourceFocus, ...implementationFocus];
const focusOutput = resolve(
  auditDirectory,
  'comparison-source-home-coverage-profile-services.png',
);
await sharp({
  create: {
    width: 360 * focusPanels.length + gap * (focusPanels.length - 1),
    height: 360,
    channels: 3,
    background: '#050505',
  },
})
  .composite(
    focusPanels.map((input, index) => ({
      input,
      left: index * (360 + gap),
      top: 0,
    })),
  )
  .png()
  .toFile(focusOutput);

process.stdout.write(
  `${JSON.stringify({ overviewOutput, interactionOutput, equivalentOutput, focusOutput })}\n`,
);
