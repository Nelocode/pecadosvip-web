import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import sharp from 'sharp';

type RawSharpResult = {
  data: Buffer;
  info: { width: number; height: number; channels: number };
};

type RawSharpInstance = {
  ensureAlpha(): {
    raw(): {
      toBuffer(options: { resolveWithObject: true }): Promise<RawSharpResult>;
    };
  };
};

type FiligreeSharpInstance = {
  extract(region: {
    left: number;
    top: number;
    width: number;
    height: number;
  }): FiligreeSharpInstance;
  resize(
    width: number,
    height: number,
    options: {
      fit: 'fill' | 'inside';
      withoutEnlargement: boolean;
      kernel: 'lanczos3';
    },
  ): FiligreeSharpInstance;
  webp(options: {
    quality: number;
    effort: number;
    smartSubsample: boolean;
  }): FiligreeSharpInstance;
  toBuffer(): Promise<Buffer>;
};

type RawSharpFactory = (
  input: Buffer,
  options: {
    raw: { width: number; height: number; channels: 4 };
  },
) => FiligreeSharpInstance;

type OutputDefinition = {
  key: 'border-filigree' | 'border-filigree-left' | 'border-filigree-right';
  filename: string;
  width: number;
  height: number;
  crop?: { left: number; top: number; width: number; height: number };
};

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(
  root,
  'assets/brand/filigree-mosaic-source-v04.png',
);
const selectedDirectory = resolve(root, 'assets/synthetic-decor/selected');
const manifestPath = resolve(root, 'assets/synthetic-decor/ASSET_MANIFEST.csv');
const expectedSourceHash =
  'B169F9E48C3B5000DAC445BF42F6AE2225E9F7B2B6AB3A550BA21DCB0269BD11';

const outputDefinitions: readonly OutputDefinition[] = [
  {
    key: 'border-filigree',
    filename: 'border-filigree-mosaic-v04.webp',
    width: 768,
    height: 768,
  },
  {
    key: 'border-filigree-left',
    filename: 'border-filigree-left-v05.webp',
    width: 320,
    height: 1056,
    crop: { left: 0, top: 0, width: 380, height: 1254 },
  },
  {
    key: 'border-filigree-right',
    filename: 'border-filigree-right-v05.webp',
    width: 320,
    height: 1056,
    crop: { left: 874, top: 0, width: 380, height: 1254 },
  },
];

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

const sourceBytes = await readFile(sourcePath);
const sourceHash = sha256(sourceBytes);
if (sourceHash !== expectedSourceHash) {
  throw new Error(
    `Unexpected filigree source SHA-256: ${sourceHash}. Refusing to transform a different asset.`,
  );
}

const sourceMetadata = await sharp(sourceBytes).metadata();
if (
  sourceMetadata.format !== 'png' ||
  sourceMetadata.width !== 1254 ||
  sourceMetadata.height !== 1254
) {
  throw new Error(
    `Unexpected filigree source metadata: ${JSON.stringify(sourceMetadata)}`,
  );
}

const sourceRaw = await (sharp(sourceBytes) as unknown as RawSharpInstance)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
if (
  sourceRaw.info.width !== 1254 ||
  sourceRaw.info.height !== 1254 ||
  sourceRaw.info.channels !== 4
) {
  throw new Error('The filigree source could not be decoded as the expected RGBA canvas.');
}

let transparentPixels = 0;
let subtlePixels = 0;
let visiblePixels = 0;
for (let index = 0; index < sourceRaw.data.length; index += 4) {
  const red = sourceRaw.data[index]!;
  const green = sourceRaw.data[index + 1]!;
  const blue = sourceRaw.data[index + 2]!;
  const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
  const warmth = Math.max(0, Math.min(1, (red - blue - 4) / 72));
  const luminanceSignal = Math.max(
    0,
    Math.min(1, (luminance - 22) / 188),
  );
  const backgroundAlpha =
    Math.max(0, Math.min(1, (luminance - 3) / 42)) * 0.035;
  const goldAlpha = Math.pow(
    luminanceSignal * (0.18 + 0.82 * warmth),
    0.86,
  );
  const alpha = Math.round(Math.max(backgroundAlpha, goldAlpha) * 255);
  sourceRaw.data[index + 3] = alpha;
  if (alpha === 0) transparentPixels += 1;
  if (alpha > 0 && alpha < 24) subtlePixels += 1;
  if (alpha >= 96) visiblePixels += 1;
}

const totalPixels = sourceRaw.info.width * sourceRaw.info.height;
if (
  transparentPixels < totalPixels * 0.1 ||
  subtlePixels < totalPixels * 0.45 ||
  visiblePixels < totalPixels * 0.2
) {
  throw new Error(
    `Filigree alpha separation is outside the expected range: transparent=${transparentPixels}, subtle=${subtlePixels}, visible=${visiblePixels}`,
  );
}

await mkdir(selectedDirectory, { recursive: true });

const outputs = await Promise.all(outputDefinitions.map(async (definition) => {
  let pipeline = (sharp as unknown as RawSharpFactory)(sourceRaw.data, {
    raw: {
      width: sourceRaw.info.width,
      height: sourceRaw.info.height,
      channels: 4,
    },
  });

  if (definition.crop) {
    pipeline = pipeline.extract(definition.crop);
  }

  const outputBytes = await pipeline
    .resize(definition.width, definition.height, {
      fit: definition.crop ? 'fill' : 'inside',
      withoutEnlargement: true,
      kernel: 'lanczos3',
    })
    .webp({ quality: 86, effort: 6, smartSubsample: true })
    .toBuffer();

  const outputMetadata = await sharp(outputBytes).metadata();
  if (
    outputMetadata.format !== 'webp' ||
    outputMetadata.width !== definition.width ||
    outputMetadata.height !== definition.height
  ) {
    throw new Error(
      `Invalid ${definition.key} derivative: ${JSON.stringify(outputMetadata)}`,
    );
  }

  const outputRaw = await (sharp(outputBytes) as unknown as RawSharpInstance)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let alphaMin = 255;
  let alphaMax = 0;
  for (let index = 3; index < outputRaw.data.length; index += 4) {
    alphaMin = Math.min(alphaMin, outputRaw.data[index]!);
    alphaMax = Math.max(alphaMax, outputRaw.data[index]!);
  }
  if (alphaMin !== 0 || alphaMax < 240) {
    throw new Error(
      `${definition.key} lacks the expected alpha range: min=${alphaMin}, max=${alphaMax}`,
    );
  }

  const outputPath = resolve(selectedDirectory, definition.filename);
  await writeFile(outputPath, outputBytes);
  return {
    ...definition,
    path: outputPath,
    sha256: sha256(outputBytes),
    bytes: outputBytes.byteLength,
    alphaMin,
    alphaMax,
  };
}));

const manifestHeader = [
  'key',
  'master_path',
  'selected_path',
  'public_path',
  'source_sha256',
  'selected_sha256',
  'source_dimensions',
  'selected_dimensions',
  'master_mime_type',
  'selected_mime_type',
  'source_provenance',
  'synthetic_confirmed',
  'technical_review',
  'human_review',
  'rights_review',
  'legal_review',
  'notes',
].join(',');
const manifestRows = outputs.map((output) =>
  [
    output.key,
    'assets/brand/filigree-mosaic-source-v04.png',
    `assets/synthetic-decor/selected/${output.filename}`,
    '',
    sourceHash,
    output.sha256,
    '1254x1254',
    `${output.width}x${output.height}`,
    'image/png',
    'image/webp',
    'user_supplied_chatgpt_gold_mosaic',
    'true',
    'PASS_HASH_DIMENSION_FORMAT_ALPHA',
    'PENDING',
    'PENDING',
    'PENDING',
    'local_preview_only_no_publication',
  ].join(','),
);
await writeFile(manifestPath, `${[manifestHeader, ...manifestRows].join('\n')}\n`, 'utf8');

process.stdout.write(
  `${JSON.stringify({
    result: 'brand-filigree-prepared',
    source: {
      path: sourcePath,
      sha256: sourceHash,
      width: sourceMetadata.width,
      height: sourceMetadata.height,
    },
    outputs,
    manifest: manifestPath,
  })}\n`,
);
