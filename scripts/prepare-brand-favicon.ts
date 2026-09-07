import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import sharp from 'sharp';

type RawSharpResult = {
  data: Buffer;
  info: { width: number; height: number; channels: number };
};

type RawSharpInstance = {
  raw(): {
    toBuffer(options: { resolveWithObject: true }): Promise<RawSharpResult>;
  };
};

type CompressedPngSharpInstance = {
  png(options: { compressionLevel: number; effort: number }): {
    toBuffer(): Promise<Buffer>;
  };
};

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'assets/brand/favicon-source.svg');

const outputs = [
  { path: resolve(root, 'app/icon.png'), size: 256 },
  { path: resolve(root, 'app/apple-icon.png'), size: 180 },
] as const;

const source = await readFile(sourcePath, 'utf8');
const pathTags = source.match(/<path\b[^>]*\/>/g) ?? [];
const opaqueCanvasPaths = pathTags.filter(
  (pathTag) =>
    /\bfill="rgb\(0,0,0\)"/.test(pathTag) &&
    /\bd="M0,1254\b/.test(pathTag) &&
    /C0,1254 0,0 0,0/.test(pathTag) &&
    /C0,0 1254,0 1254,0/.test(pathTag),
);

if (opaqueCanvasPaths.length !== 1) {
  throw new Error(
    `Expected exactly one opaque full-canvas background path, found ${opaqueCanvasPaths.length}`,
  );
}

const transparentSource = source.replace(opaqueCanvasPaths[0], '');
if (transparentSource === source) {
  throw new Error('The opaque full-canvas background path was not removed');
}

function renderSourceAt(svg: string, size: number) {
  const rendered = svg.replace(
    /(<svg\b[^>]*\bwidth=")256("\s+height=")256(")/,
    `$1${size}$2${size}$3`,
  );

  if (rendered === svg) {
    throw new Error('The SVG raster dimensions could not be prepared');
  }

  return Buffer.from(rendered);
}

async function validateDerivative(bytes: Buffer, path: string, size: number) {
  const metadata = await sharp(bytes).metadata();
  if (
    metadata.format !== 'png' ||
    metadata.width !== size ||
    metadata.height !== size
  ) {
    throw new Error(`Invalid favicon derivative: ${path}`);
  }

  // The project-wide Sharp compatibility declaration intentionally exposes only
  // the production transform surface. This local bridge is limited to the raw
  // pixel read needed to prove that the generated PNG has a real alpha channel.
  const { data, info } = await (sharp(bytes) as unknown as RawSharpInstance)
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) {
    throw new Error(`Favicon does not contain an RGBA channel set: ${path}`);
  }

  let alphaMin = 255;
  let alphaMax = 0;
  let transparentPixels = 0;
  for (let index = 3; index < data.length; index += info.channels) {
    const alpha = data[index];
    alphaMin = Math.min(alphaMin, alpha);
    alphaMax = Math.max(alphaMax, alpha);
    if (alpha === 0) transparentPixels += 1;
  }

  if (alphaMin !== 0 || alphaMax !== 255 || transparentPixels === 0) {
    throw new Error(
      `Favicon alpha validation failed for ${path}: min=${alphaMin}, max=${alphaMax}, transparent=${transparentPixels}`,
    );
  }

  const corners = [
    3,
    (size - 1) * info.channels + 3,
    (size - 1) * size * info.channels + 3,
    (size * size - 1) * info.channels + 3,
  ];
  for (const alphaIndex of corners) {
    if (data[alphaIndex] !== 0) {
      throw new Error(`Favicon corner is not transparent: ${path}`);
    }
  }

  return { alphaMin, alphaMax, transparentPixels };
}

const generated = [];

for (const output of outputs) {
  await mkdir(dirname(output.path), { recursive: true });
  const rasterSize = output.size * 4;
  const resized = sharp(renderSourceAt(transparentSource, rasterSize)).resize(
    output.size,
    output.size,
    { fit: 'inside' },
  );
  // Same compatibility boundary as the raw-pixel reader above: compression
  // controls are supported by the installed Sharp runtime but intentionally
  // omitted from the project's narrow declaration.
  const bytes = await (resized as unknown as CompressedPngSharpInstance)
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
  const alpha = await validateDerivative(bytes, output.path, output.size);
  await writeFile(output.path, bytes);
  generated.push({ ...output, alpha });
}

process.stdout.write(
  `${JSON.stringify({
    result: 'brand-favicon-prepared',
    source: sourcePath,
    removedOpaqueCanvasPaths: opaqueCanvasPaths.length,
    outputs: generated,
  })}\n`,
);
