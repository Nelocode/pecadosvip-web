import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import {
  getSyntheticCityMedia,
  syntheticCityMediaSlugs,
} from '../lib/preview/synthetic-city-media.ts';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(repositoryRoot, 'assets/synthetic-cities/ASSET_MANIFEST.csv');
const assetsRoot = dirname(manifestPath);
const selectedDirectory = resolve(assetsRoot, 'selected');
const header = [
  'city_slug',
  'asset_role',
  'master_path',
  'selected_path',
  'public_path',
  'prompt_version',
  'derivative_generated_at_utc',
  'generator',
  'model_version',
  'source_sha256',
  'selected_sha256',
  'source_dimensions',
  'selected_dimensions',
  'master_mime_type',
  'selected_mime_type',
  'synthetic_confirmed',
  'technical_review',
  'human_review',
  'linguistic_review',
  'rights_review',
  'legal_review',
  'alt_i18n_key',
  'visible_disclosure_key',
  'notes',
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
    if (columns[0] && columns[6] && columns[9] && columns[10]) {
      records.set(columns[0], {
        timestamp: columns[6],
        sourceHash: columns[9],
        selectedHash: columns[10],
      });
    }
  }
  return records;
}

const generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/u, 'Z');
const previousManifestBuffer = existsSync(manifestPath) ? await readFile(manifestPath) : undefined;
const existingRecords = parseExistingManifest(previousManifestBuffer?.toString('utf8') ?? '');
const sourceHashes = new Set<string>();
const selectedHashes = new Set<string>();
const rows: string[] = [];
const outputs: Array<{ filename: string; buffer: Buffer }> = [];

for (const citySlug of syntheticCityMediaSlugs) {
  const media = getSyntheticCityMedia(citySlug, 'es');
  const selectedPath = media.sourcePath.replaceAll('\\', '/');
  const selectedFilename = basename(selectedPath);
  const masterPath = `assets/synthetic-cities/master/${selectedFilename.replace(/\.webp$/u, '.png')}`;
  const masterAbsolute = resolveRepositoryPath(masterPath);
  resolveRepositoryPath(selectedPath);

  if (!existsSync(masterAbsolute)) {
    throw new Error(`Missing city master: ${masterPath}`);
  }

  const masterBuffer = await readFile(masterAbsolute);
  const masterMetadata = await sharp(masterBuffer).metadata();
  const selectedBuffer = await sharp(masterBuffer)
    .resize(1200, 900, { fit: 'cover', position: 'centre' })
    .webp({ quality: 86 })
    .toBuffer();
  const selectedMetadata = await sharp(selectedBuffer).metadata();

  if (
    masterMetadata.format !== 'png' ||
    selectedMetadata.format !== 'webp' ||
    !masterMetadata.width ||
    !masterMetadata.height ||
    selectedMetadata.width !== 1200 ||
    selectedMetadata.height !== 900
  ) {
    throw new Error(`Unexpected city asset dimensions for ${citySlug}`);
  }

  const sourceHash = sha256(masterBuffer);
  const selectedHash = sha256(selectedBuffer);
  if (!sourceHashes.add(sourceHash) || !selectedHashes.add(selectedHash)) {
    throw new Error(`Duplicate city image content detected for ${citySlug}`);
  }

  const previous = existingRecords.get(citySlug);
  const derivativeGeneratedAt =
    previous?.sourceHash === sourceHash && previous.selectedHash === selectedHash
      ? previous.timestamp
      : generatedAt;
  outputs.push({ filename: selectedFilename, buffer: selectedBuffer });
  rows.push([
    citySlug,
    'reference',
    masterPath,
    selectedPath,
    '',
    'v1',
    derivativeGeneratedAt,
    'OpenAI ImageGen runtime',
    'UNKNOWN',
    sourceHash,
    selectedHash,
    `${masterMetadata.width}x${masterMetadata.height}`,
    `${selectedMetadata.width}x${selectedMetadata.height}`,
    'image/png',
    'image/webp',
    'true',
    'PASS_HASH_DIMENSION_FORMAT_UNIQUE',
    'PENDING',
    'PENDING',
    'PENDING',
    'PENDING',
    `city.${citySlug}.alt`,
    'syntheticCity.referenceDisclosure',
    'local_preview_only_no_publication',
  ].join(','));
}

const nextManifest = Buffer.from(`${header}\n${rows.join('\n')}\n`, 'utf8');
await mkdir(selectedDirectory, { recursive: true });
const previousSelected = new Map<string, Buffer>();
for (const entry of await readdir(selectedDirectory, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.webp')) {
    previousSelected.set(entry.name, await readFile(resolve(selectedDirectory, entry.name)));
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

console.log(`Prepared ${rows.length} unique city reference assets.`);
