import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import sharp from 'sharp';

import {
  getSyntheticServiceMedia,
  syntheticServiceMediaKeys,
} from '../lib/preview/synthetic-service-media.ts';
import { getSyntheticServiceCatalog } from '../lib/preview/synthetic-services.ts';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(
  repositoryRoot,
  'assets/synthetic-services/ASSET_MANIFEST.csv',
);
const assetsRoot = dirname(manifestPath);
const selectedDirectory = resolve(assetsRoot, 'selected');
const header = [
  'key',
  'group',
  'master_path',
  'selected_path',
  'public_path',
  'derivative_generated_at_utc',
  'generator',
  'source_sha256',
  'selected_sha256',
  'source_dimensions',
  'selected_dimensions',
  'synthetic_confirmed',
  'technical_review',
  'human_review',
  'legal_review',
].join(',');

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function resolveRepositoryPath(path: string): string {
  const absolute = resolve(repositoryRoot, path);
  const fromRoot = relative(repositoryRoot, absolute);
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`Path escapes the repository: ${path}`);
  }
  return absolute;
}

type ExistingRecord = {
  timestamp: string;
  sourceHash: string;
  selectedHash: string;
};

function parseExistingManifest(source: string): Map<string, ExistingRecord> {
  const records = new Map<string, ExistingRecord>();
  for (const row of source.trim().split(/\r?\n/u).slice(1)) {
    const columns = row.split(',');
    if (columns[0] && columns[5] && columns[7] && columns[8]) {
      records.set(columns[0], {
        timestamp: columns[5],
        sourceHash: columns[7],
        selectedHash: columns[8],
      });
    }
  }
  return records;
}

const catalog = getSyntheticServiceCatalog('es');
const groups = new Map(catalog.map((service) => [service.mediaKey, service.group]));
const generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/u, 'Z');
const previousManifestBuffer = existsSync(manifestPath)
  ? await readFile(manifestPath)
  : undefined;
const existingRecords = parseExistingManifest(
  previousManifestBuffer?.toString('utf8') ?? '',
);
const rows: string[] = [];
const sourceHashes = new Set<string>();
const selectedHashes = new Set<string>();
const outputs: Array<{ filename: string; buffer: Buffer }> = [];

for (const key of syntheticServiceMediaKeys) {
  const media = getSyntheticServiceMedia(key, 'es');
  const selectedPath = media.sourcePath.replaceAll('\\', '/');
  const selectedFilename = basename(selectedPath);
  const masterPath = `assets/synthetic-services/master/${selectedFilename.replace(/\.webp$/u, '.png')}`;
  const masterAbsolute = resolveRepositoryPath(masterPath);
  resolveRepositoryPath(selectedPath);

  if (!existsSync(masterAbsolute)) {
    throw new Error(`Missing service master: ${masterPath}`);
  }

  const masterBuffer = await readFile(masterAbsolute);
  const masterMetadata = await sharp(masterBuffer).metadata();
  const selectedBuffer = await sharp(masterBuffer)
    .resize(960, 1200, { fit: 'cover', position: 'centre' })
    .webp({ quality: 86 })
    .toBuffer();
  const selectedMetadata = await sharp(selectedBuffer).metadata();

  if (
    masterMetadata.format !== 'png' ||
    selectedMetadata.format !== 'webp' ||
    !masterMetadata.width ||
    !masterMetadata.height ||
    selectedMetadata.width !== 960 ||
    selectedMetadata.height !== 1200
  ) {
    throw new Error(`Unexpected dimensions for ${key}`);
  }

  const sourceHash = sha256(masterBuffer);
  const selectedHash = sha256(selectedBuffer);
  if (!sourceHashes.add(sourceHash) || !selectedHashes.add(selectedHash)) {
    throw new Error(`Duplicate image content detected for ${key}`);
  }

  const previous = existingRecords.get(key);
  const derivativeGeneratedAt =
    previous?.sourceHash === sourceHash && previous.selectedHash === selectedHash
      ? previous.timestamp
      : generatedAt;
  outputs.push({ filename: selectedFilename, buffer: selectedBuffer });

  rows.push(
    [
      key,
      groups.get(key),
      masterPath,
      selectedPath,
      '',
      derivativeGeneratedAt,
      'OpenAI ImageGen runtime',
      sourceHash,
      selectedHash,
      `${masterMetadata.width}x${masterMetadata.height}`,
      `${selectedMetadata.width}x${selectedMetadata.height}`,
      'true',
      'PASS_HASH_DIMENSION_FORMAT_UNIQUE',
      'PENDING',
      'PENDING',
    ].join(','),
  );
}

const nextManifest = Buffer.from(`${header}\n${rows.join('\n')}\n`, 'utf8');
await mkdir(selectedDirectory, { recursive: true });
const previousSelected = new Map<string, Buffer>();
for (const entry of await readdir(selectedDirectory, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.webp')) {
    previousSelected.set(
      entry.name,
      await readFile(resolve(selectedDirectory, entry.name)),
    );
  }
}
const nextFilenames = new Set(outputs.map((output) => output.filename));

try {
  for (const output of outputs) {
    await writeFile(resolve(selectedDirectory, output.filename), output.buffer);
  }
  await writeFile(manifestPath, nextManifest);
  for (const filename of previousSelected.keys()) {
    if (!nextFilenames.has(filename)) {
      await rm(resolve(selectedDirectory, filename), { force: true });
    }
  }
} catch (error) {
  for (const [filename, buffer] of previousSelected) {
    await writeFile(resolve(selectedDirectory, filename), buffer);
  }
  for (const output of outputs) {
    if (!previousSelected.has(output.filename)) {
      await rm(resolve(selectedDirectory, output.filename), { force: true });
    }
  }
  if (previousManifestBuffer) {
    await writeFile(manifestPath, previousManifestBuffer);
  } else {
    await rm(manifestPath, { force: true });
  }
  throw error;
}
console.log(`Prepared ${rows.length} unique service assets.`);
