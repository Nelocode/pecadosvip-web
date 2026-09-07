import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  lstat,
  open,
  readFile,
  readdir,
  rename,
  rm,
  unlink,
} from 'node:fs/promises';
import { isAbsolute, join, parse, resolve } from 'node:path';

import sharp from 'sharp';

import {
  LocalFileLockError,
  withLocalFileLock,
} from '../operations/local-file-lock.ts';

export type LocalMediaKind = 'image' | 'video';
export type LocalMediaStatus = 'active' | 'archived';

export type LocalMediaMutationContext = {
  actorId: string;
  requestId: string;
};

export type LocalMediaAuditEvent = {
  id: string;
  action: 'store' | 'archive' | 'restore';
  actorId: string;
  requestId: string;
  occurredAt: string;
  fromStatus?: LocalMediaStatus;
  toStatus: LocalMediaStatus;
};

export type LocalMediaVariantName = 'desktop' | 'mobile' | 'original';

export type LocalMediaVariant = {
  name: LocalMediaVariantName;
  contentType: SupportedMediaType;
  storageKey: string;
  byteLength: number;
  sha256: string;
  width?: number;
  height?: number;
};

export type LocalMediaProcessing = {
  pipeline: 'sharp-webp-v1' | 'bounded-mp4-container-v1';
  sourceContentType: SupportedMediaType;
  sourceByteLength: number;
  sourceSha256: string;
  storedByteLength: number;
  metadataStripped: boolean;
  variants: LocalMediaVariant[];
};

export type LocalMediaRecord = {
  schemaVersion: 1;
  id: string;
  kind: LocalMediaKind;
  contentType: SupportedMediaType;
  storageKey: string;
  byteLength: number;
  sha256: string;
  alt: string;
  rightsEvidenceReference: string;
  status: LocalMediaStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  revision: number;
  auditEvents: LocalMediaAuditEvent[];
  processing?: LocalMediaProcessing;
};

export type StoreLocalMediaInput = {
  bytes: Uint8Array;
  contentType: SupportedMediaType;
  alt: string;
  rightsEvidenceReference: string;
};

export type SupportedMediaType = keyof typeof mediaRules;

export type LocalMediaStoreErrorCode =
  | 'INVALID_RUNTIME'
  | 'INVALID_ROOT'
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_MEDIA'
  | 'MEDIA_TOO_LARGE'
  | 'MEDIA_NOT_FOUND'
  | 'MEDIA_ARCHIVED'
  | 'DUPLICATE_REQUEST'
  | 'MEDIA_BUSY'
  | 'CAPACITY_EXCEEDED'
  | 'INTEGRITY_FAILURE';

export class LocalMediaStoreError extends Error {
  public readonly code: LocalMediaStoreErrorCode;

  constructor(code: LocalMediaStoreErrorCode, message: string) {
    super(message);
    this.name = 'LocalMediaStoreError';
    this.code = code;
  }
}

const mebibyte = 1024 * 1024;
const evidencePattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,255}$/;
const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actorIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const maxStoredMedia = 500;
const maxStoredBytes = 512 * mebibyte;
const maxStorageEntries = maxStoredMedia * 2 + 16;
const maxMetadataBytes = 256 * 1024;
const maxImagePixels = 40_000_000;
const maxImageDimension = 8_192;
const maxOptimizedImageBytes = 8 * mebibyte;
const maximumMp4Boxes = 4_096;
const processedDirectoryPattern = /^\.[0-9a-f-]+\.staging-[0-9a-f-]+$/i;

const mediaRules = {
  'image/jpeg': {
    extension: 'jpg',
    kind: 'image',
    maxBytes: 20 * mebibyte,
    signature: (bytes: Uint8Array) =>
      bytes.length >= 4 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff &&
      bytes.at(-2) === 0xff &&
      bytes.at(-1) === 0xd9,
  },
  'image/png': {
    extension: 'png',
    kind: 'image',
    maxBytes: 20 * mebibyte,
    signature: (bytes: Uint8Array) =>
      bytes.length >= 33 &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (value, index) => bytes[index] === value,
      ) &&
      Buffer.from(bytes.subarray(12, 16)).toString('ascii') === 'IHDR' &&
      Buffer.from(bytes.subarray(-8, -4)).toString('ascii') === 'IEND',
  },
  'image/webp': {
    extension: 'webp',
    kind: 'image',
    maxBytes: 20 * mebibyte,
    signature: (bytes: Uint8Array) =>
      bytes.length >= 20 &&
      Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' &&
      Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP' &&
      Buffer.from(bytes).readUInt32LE(4) + 8 === bytes.length,
  },
  'video/mp4': {
    extension: 'mp4',
    kind: 'video',
    maxBytes: 32 * mebibyte,
    signature: (bytes: Uint8Array) => validateMp4Container(bytes),
  },
} as const;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function inspectMp4Container(bytes: Uint8Array): string[] | undefined {
  if (bytes.byteLength < 40) return undefined;
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const boxTypes: string[] = [];
  let offset = 0;
  let moovStart = -1;
  let moovEnd = -1;

  while (offset < buffer.byteLength) {
    if (boxTypes.length >= maximumMp4Boxes || offset + 8 > buffer.byteLength) {
      return undefined;
    }
    const size32 = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    if (!/^[A-Za-z0-9 ]{4}$/.test(type)) return undefined;

    let headerLength = 8;
    let boxLength = size32;
    if (size32 === 1) {
      if (offset + 16 > buffer.byteLength) return undefined;
      const extendedSize = buffer.readBigUInt64BE(offset + 8);
      if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
      headerLength = 16;
      boxLength = Number(extendedSize);
    } else if (size32 === 0) {
      boxLength = buffer.byteLength - offset;
    }
    if (
      boxLength < headerLength ||
      boxLength > buffer.byteLength - offset ||
      (size32 === 0 && offset + boxLength !== buffer.byteLength)
    ) {
      return undefined;
    }

    boxTypes.push(type);
    if (type === 'moov') {
      moovStart = offset + headerLength;
      moovEnd = offset + boxLength;
    }
    offset += boxLength;
  }

  if (offset !== buffer.byteLength || boxTypes[0] !== 'ftyp') return undefined;
  const firstBoxLength = buffer.readUInt32BE(0);
  if (firstBoxLength < 16 || firstBoxLength > buffer.byteLength) return undefined;
  const majorBrand = buffer.subarray(8, 12).toString('ascii');
  const acceptedBrands = new Set(['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V ']);
  if (!acceptedBrands.has(majorBrand)) return undefined;
  if (
    !boxTypes.includes('moov') ||
    !boxTypes.includes('mdat') ||
    boxTypes.includes('moof') ||
    moovStart < 0 ||
    moovEnd <= moovStart
  ) {
    return undefined;
  }
  const moovPayload = buffer.subarray(moovStart, moovEnd);
  if (!moovPayload.includes(Buffer.from('vide', 'ascii'))) return undefined;
  return boxTypes;
}

function validateMp4Container(bytes: Uint8Array): boolean {
  return inspectMp4Container(bytes) !== undefined;
}

type PreparedMedia = {
  primary: LocalMediaVariant;
  processing: LocalMediaProcessing;
  files: Array<{ name: string; bytes: Uint8Array }>;
};

async function optimizeImage(
  id: string,
  input: StoreLocalMediaInput,
): Promise<PreparedMedia> {
  let metadata;
  try {
    metadata = await sharp(input.bytes, {
      failOn: 'warning',
      limitInputPixels: maxImagePixels,
      sequentialRead: true,
    }).metadata();
  } catch {
    throw new LocalMediaStoreError(
      'UNSUPPORTED_MEDIA',
      'The image decoder rejected the supplied image.',
    );
  }
  const expectedFormat =
    input.contentType === 'image/jpeg'
      ? 'jpeg'
      : input.contentType === 'image/png'
        ? 'png'
        : input.contentType === 'image/webp'
          ? 'webp'
          : undefined;
  if (
    !expectedFormat ||
    metadata.format !== expectedFormat ||
    !Number.isSafeInteger(metadata.width) ||
    !Number.isSafeInteger(metadata.height) ||
    !metadata.width ||
    !metadata.height ||
    metadata.width > maxImageDimension ||
    metadata.height > maxImageDimension ||
    metadata.width * metadata.height > maxImagePixels ||
    (metadata.pages ?? 1) !== 1
  ) {
    throw new LocalMediaStoreError(
      'UNSUPPORTED_MEDIA',
      'The image dimensions, page count or decoded format are unsupported.',
    );
  }

  const configurations = [
    { name: 'desktop' as const, width: 1_600, height: 2_000, quality: 82 },
    { name: 'mobile' as const, width: 768, height: 1_024, quality: 78 },
  ];
  const variants: LocalMediaVariant[] = [];
  const files: PreparedMedia['files'] = [];
  try {
    for (const configuration of configurations) {
      const result = await sharp(input.bytes, {
        failOn: 'warning',
        limitInputPixels: maxImagePixels,
        sequentialRead: true,
      })
        .rotate()
        .resize({
          width: configuration.width,
          height: configuration.height,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toColourspace('srgb')
        .webp({
          quality: configuration.quality,
          effort: 4,
          smartSubsample: true,
        })
        .toBuffer({ resolveWithObject: true });
      if (
        result.data.byteLength < 1 ||
        result.data.byteLength > maxOptimizedImageBytes ||
        !Number.isSafeInteger(result.info.width) ||
        !Number.isSafeInteger(result.info.height) ||
        result.info.width < 1 ||
        result.info.height < 1 ||
        !mediaRules['image/webp'].signature(result.data)
      ) {
        throw new Error('invalid optimized image');
      }
      const name = `${configuration.name}.webp`;
      variants.push({
        name: configuration.name,
        contentType: 'image/webp',
        storageKey: `${id}/${name}`,
        byteLength: result.data.byteLength,
        sha256: digest(result.data),
        width: result.info.width,
        height: result.info.height,
      });
      files.push({ name, bytes: result.data });
    }
  } catch (error) {
    if (error instanceof LocalMediaStoreError) throw error;
    throw new LocalMediaStoreError(
      'UNSUPPORTED_MEDIA',
      'The image could not be normalized into bounded WebP variants.',
    );
  }
  const primary = variants[0]!;
  return {
    primary,
    files,
    processing: {
      pipeline: 'sharp-webp-v1',
      sourceContentType: input.contentType,
      sourceByteLength: input.bytes.byteLength,
      sourceSha256: digest(input.bytes),
      storedByteLength: variants.reduce(
        (total, variant) => total + variant.byteLength,
        0,
      ),
      metadataStripped: true,
      variants,
    },
  };
}

function validateVideo(id: string, input: StoreLocalMediaInput): PreparedMedia {
  if (input.contentType !== 'video/mp4' || !inspectMp4Container(input.bytes)) {
    throw new LocalMediaStoreError(
      'UNSUPPORTED_MEDIA',
      "The MP4 container is malformed, fragmented or lacks the required structural 'vide' marker.",
    );
  }
  const name = 'original.mp4';
  const variant: LocalMediaVariant = {
    name: 'original',
    contentType: 'video/mp4',
    storageKey: `${id}/${name}`,
    byteLength: input.bytes.byteLength,
    sha256: digest(input.bytes),
  };
  return {
    primary: variant,
    files: [{ name, bytes: input.bytes }],
    processing: {
      pipeline: 'bounded-mp4-container-v1',
      sourceContentType: input.contentType,
      sourceByteLength: input.bytes.byteLength,
      sourceSha256: variant.sha256,
      storedByteLength: input.bytes.byteLength,
      metadataStripped: false,
      variants: [variant],
    },
  };
}

function assertClock(value: string): string {
  if (!Number.isFinite(Date.parse(value))) {
    throw new LocalMediaStoreError(
      'INVALID_INPUT',
      'The media-store clock returned an invalid timestamp.',
    );
  }
  return value;
}

function assertMediaId(id: string): void {
  if (!mediaIdPattern.test(id)) {
    throw new LocalMediaStoreError('INVALID_INPUT', 'Invalid media identifier.');
  }
}

function normalizeMutationContext(
  context: LocalMediaMutationContext | undefined,
): LocalMediaMutationContext {
  const candidate = context ?? {
    actorId: 'local-adapter',
    requestId: `local-${randomUUID()}`,
  };
  if (
    !actorIdPattern.test(candidate.actorId) ||
    !requestIdPattern.test(candidate.requestId)
  ) {
    throw new LocalMediaStoreError(
      'INVALID_INPUT',
      'Opaque actor and request references are required for media mutations.',
    );
  }
  return clone(candidate);
}

function assertProcessing(
  record: Partial<LocalMediaRecord>,
): asserts record is Partial<LocalMediaRecord> & {
  processing: LocalMediaProcessing;
} {
  const processing = record.processing;
  if (
    !processing ||
    typeof processing !== 'object' ||
    (processing.pipeline !== 'sharp-webp-v1' &&
      processing.pipeline !== 'bounded-mp4-container-v1') ||
    !(processing.sourceContentType in mediaRules) ||
    !Number.isSafeInteger(processing.sourceByteLength) ||
    processing.sourceByteLength < 1 ||
    processing.sourceByteLength >
      mediaRules[processing.sourceContentType].maxBytes ||
    !/^[0-9a-f]{64}$/.test(processing.sourceSha256) ||
    !Number.isSafeInteger(processing.storedByteLength) ||
    processing.storedByteLength < 1 ||
    processing.storedByteLength > maxStoredBytes ||
    typeof processing.metadataStripped !== 'boolean' ||
    !Array.isArray(processing.variants)
  ) {
    throw new LocalMediaStoreError(
      'INTEGRITY_FAILURE',
      'Invalid media processing metadata.',
    );
  }
  const expectedNames =
    processing.pipeline === 'sharp-webp-v1'
      ? ['desktop', 'mobile']
      : ['original'];
  if (
    processing.variants.length !== expectedNames.length ||
    processing.variants.some((variant, index) => {
      const expectedName = expectedNames[index];
      const expectedType =
        processing.pipeline === 'sharp-webp-v1' ? 'image/webp' : 'video/mp4';
      const expectedExtension = expectedType === 'image/webp' ? 'webp' : 'mp4';
      const imageDimensionsValid =
        expectedType !== 'image/webp' ||
        (Number.isSafeInteger(variant.width) &&
          Number.isSafeInteger(variant.height) &&
          (variant.width ?? 0) >= 1 &&
          (variant.height ?? 0) >= 1 &&
          (variant.width ?? 0) <= maxImageDimension &&
          (variant.height ?? 0) <= maxImageDimension);
      const videoDimensionsAbsent =
        expectedType !== 'video/mp4' ||
        (variant.width === undefined && variant.height === undefined);
      return (
        variant.name !== expectedName ||
        variant.contentType !== expectedType ||
        variant.storageKey !==
          `${record.id}/${expectedName}.${expectedExtension}` ||
        !Number.isSafeInteger(variant.byteLength) ||
        variant.byteLength < 1 ||
        variant.byteLength >
          (expectedType === 'image/webp'
            ? maxOptimizedImageBytes
            : mediaRules['video/mp4'].maxBytes) ||
        !/^[0-9a-f]{64}$/.test(variant.sha256) ||
        !imageDimensionsValid ||
        !videoDimensionsAbsent
      );
    }) ||
    processing.storedByteLength !==
      processing.variants.reduce(
        (total, variant) => total + variant.byteLength,
        0,
      ) ||
    record.storageKey !== processing.variants[0]!.storageKey ||
    record.contentType !== processing.variants[0]!.contentType ||
    record.byteLength !== processing.variants[0]!.byteLength ||
    record.sha256 !== processing.variants[0]!.sha256 ||
    (processing.pipeline === 'sharp-webp-v1' &&
      (record.kind !== 'image' ||
        mediaRules[processing.sourceContentType].kind !== 'image' ||
        processing.metadataStripped !== true)) ||
    (processing.pipeline === 'bounded-mp4-container-v1' &&
      (record.kind !== 'video' ||
        processing.sourceContentType !== 'video/mp4' ||
        processing.metadataStripped !== false))
  ) {
    throw new LocalMediaStoreError(
      'INTEGRITY_FAILURE',
      'Media processing invariants do not match.',
    );
  }
}

function assertRecord(value: unknown): asserts value is LocalMediaRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new LocalMediaStoreError('INTEGRITY_FAILURE', 'Invalid media metadata.');
  }
  const record = value as Partial<LocalMediaRecord>;
  const auditEvents = record.auditEvents;
  if (
    record.schemaVersion !== 1 ||
    typeof record.id !== 'string' ||
    !mediaIdPattern.test(record.id) ||
    !(record.contentType && record.contentType in mediaRules) ||
    (record.kind !== 'image' && record.kind !== 'video') ||
    typeof record.storageKey !== 'string' ||
    !(
      /^[0-9a-f-]+\.(?:jpg|png|webp|mp4)$/i.test(record.storageKey) ||
      /^[0-9a-f-]+\/(?:desktop|mobile)\.webp$/i.test(record.storageKey) ||
      /^[0-9a-f-]+\/original\.mp4$/i.test(record.storageKey)
    ) ||
    typeof record.byteLength !== 'number' ||
    !Number.isSafeInteger(record.byteLength) ||
    record.byteLength < 1 ||
    typeof record.sha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(record.sha256) ||
    typeof record.alt !== 'string' ||
    record.alt.trim() !== record.alt ||
    record.alt.length < 1 ||
    record.alt.length > 240 ||
    typeof record.rightsEvidenceReference !== 'string' ||
    !evidencePattern.test(record.rightsEvidenceReference) ||
    (record.status !== 'active' && record.status !== 'archived') ||
    typeof record.createdAt !== 'string' ||
    typeof record.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(record.createdAt)) ||
    !Number.isFinite(Date.parse(record.updatedAt)) ||
    !Number.isInteger(record.revision) ||
    !Array.isArray(auditEvents) ||
    auditEvents.length < 1 ||
    record.revision !== auditEvents.length
  ) {
    throw new LocalMediaStoreError('INTEGRITY_FAILURE', 'Invalid media metadata.');
  }
  if (record.processing !== undefined) assertProcessing(record);
  const rule = mediaRules[record.contentType];
  const requestIds = new Set<string>();
  for (const [index, event] of auditEvents.entries()) {
    const expectedId = `media-audit-${String(index + 1).padStart(6, '0')}`;
    if (
      !event ||
      typeof event !== 'object' ||
      event.id !== expectedId ||
      (event.action !== 'store' &&
        event.action !== 'archive' &&
        event.action !== 'restore') ||
      !actorIdPattern.test(event.actorId) ||
      !requestIdPattern.test(event.requestId) ||
      requestIds.has(event.requestId) ||
      !Number.isFinite(Date.parse(event.occurredAt)) ||
      (event.toStatus !== 'active' && event.toStatus !== 'archived') ||
      (event.fromStatus !== undefined &&
        event.fromStatus !== 'active' &&
        event.fromStatus !== 'archived') ||
      (index === 0 &&
        (event.action !== 'store' ||
          event.fromStatus !== undefined ||
          event.toStatus !== 'active')) ||
      (index > 0 && event.action === 'store') ||
      (event.action === 'archive' &&
        (event.fromStatus !== 'active' || event.toStatus !== 'archived')) ||
      (event.action === 'restore' &&
        (event.fromStatus !== 'archived' || event.toStatus !== 'active')) ||
      (index > 0 && event.fromStatus !== auditEvents[index - 1]!.toStatus)
    ) {
      throw new LocalMediaStoreError(
        'INTEGRITY_FAILURE',
        'Invalid media audit history.',
      );
    }
    requestIds.add(event.requestId);
  }
  const lastEvent = auditEvents.at(-1)!;
  if (
    record.kind !== rule.kind ||
    (record.processing === undefined &&
      record.storageKey !== `${record.id}.${rule.extension}`) ||
    record.createdAt !== auditEvents[0]!.occurredAt ||
    record.status !== lastEvent.toStatus ||
    record.updatedAt !== lastEvent.occurredAt ||
    (record.status === 'archived' &&
      (typeof record.archivedAt !== 'string' ||
        !Number.isFinite(Date.parse(record.archivedAt)))) ||
    (record.status === 'active' && record.archivedAt !== undefined)
  ) {
    throw new LocalMediaStoreError(
      'INTEGRITY_FAILURE',
      'Media metadata invariants do not match.',
    );
  }
}

async function writeAtomic(path: string, bytes: Uint8Array | string): Promise<void> {
  const temporaryPath = `${path}.tmp-${randomUUID()}`;
  const handle = await open(temporaryPath, 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function writeDurableNewFile(
  path: string,
  bytes: Uint8Array | string,
): Promise<void> {
  const handle = await open(path, 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export class LocalMediaStore {
  private readonly root: string;
  private readonly clock: () => string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(root: string, clock: () => string = () => new Date().toISOString()) {
    if (process.env.NODE_ENV === 'production') {
      throw new LocalMediaStoreError(
        'INVALID_RUNTIME',
        'The local media store cannot run in production.',
      );
    }
    const normalized = resolve(root);
    if (
      !root.trim() ||
      !isAbsolute(root) ||
      normalized === parse(normalized).root
    ) {
      throw new LocalMediaStoreError(
        'INVALID_ROOT',
        'Media storage requires an explicit absolute non-root directory.',
      );
    }
    this.root = normalized;
    this.clock = clock;
  }

  async initialize(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const rootMetadata = await lstat(this.root);
    if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) {
      throw new LocalMediaStoreError(
        'INTEGRITY_FAILURE',
        'The media root must be a regular local directory, not a symbolic link.',
      );
    }
  }

  async store(
    input: StoreLocalMediaInput,
    context?: LocalMediaMutationContext,
  ): Promise<LocalMediaRecord> {
    return this.serialize(async () => {
      await this.initialize();
      const operation = normalizeMutationContext(context);
      const existingRecords = await this.list(true);
      this.assertRequestUnused(existingRecords, operation.requestId);
      if (existingRecords.length >= maxStoredMedia) {
        throw new LocalMediaStoreError(
          'CAPACITY_EXCEEDED',
          'The local media-store item quota is exhausted.',
        );
      }
      if (!Object.hasOwn(mediaRules, input.contentType)) {
        throw new LocalMediaStoreError(
          'UNSUPPORTED_MEDIA',
          'Unsupported media content type.',
        );
      }
      const rule = mediaRules[input.contentType];
      if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength < 1) {
        throw new LocalMediaStoreError('INVALID_INPUT', 'Media bytes are required.');
      }
      if (input.bytes.byteLength > rule.maxBytes) {
        throw new LocalMediaStoreError(
          'MEDIA_TOO_LARGE',
          'Media exceeds the local adapter size limit.',
        );
      }
      if (!rule.signature(input.bytes)) {
        throw new LocalMediaStoreError(
          'UNSUPPORTED_MEDIA',
          'Media signature does not match the declared content type.',
        );
      }
      const alt = input.alt.trim();
      if (!alt || alt.length > 240) {
        throw new LocalMediaStoreError(
          'INVALID_INPUT',
          'A concise 1-240 character media description is required.',
        );
      }
      if (!evidencePattern.test(input.rightsEvidenceReference)) {
        throw new LocalMediaStoreError(
          'INVALID_INPUT',
          'An opaque rights-evidence reference is required.',
        );
      }
      const id = randomUUID();
      const prepared =
        rule.kind === 'image'
          ? await optimizeImage(id, input)
          : validateVideo(id, input);
      const storedBytes = existingRecords.reduce(
        (total, record) =>
          total +
          (record.processing?.storedByteLength ?? record.byteLength),
        0,
      );
      if (
        storedBytes + prepared.processing.storedByteLength > maxStoredBytes
      ) {
        throw new LocalMediaStoreError(
          'CAPACITY_EXCEEDED',
          'The local media-store quota is exhausted.',
        );
      }

      const occurredAt = assertClock(this.clock());
      const record: LocalMediaRecord = {
        schemaVersion: 1,
        id,
        kind: rule.kind,
        contentType: prepared.primary.contentType,
        storageKey: prepared.primary.storageKey,
        byteLength: prepared.primary.byteLength,
        sha256: prepared.primary.sha256,
        alt,
        rightsEvidenceReference: input.rightsEvidenceReference,
        status: 'active',
        createdAt: occurredAt,
        updatedAt: occurredAt,
        revision: 1,
        auditEvents: [
          {
            id: 'media-audit-000001',
            action: 'store',
            actorId: operation.actorId,
            requestId: operation.requestId,
            occurredAt,
            toStatus: 'active',
          },
        ],
        processing: prepared.processing,
      };

      const finalDirectory = this.pathFor(id);
      const stagingDirectory = this.pathFor(`.${id}.staging-${randomUUID()}`);
      await mkdir(stagingDirectory, { recursive: false, mode: 0o700 });
      try {
        for (const file of prepared.files) {
          await writeDurableNewFile(
            resolve(join(stagingDirectory, file.name)),
            file.bytes,
          );
        }
        await writeDurableNewFile(
          resolve(join(stagingDirectory, 'metadata.json')),
          `${JSON.stringify(record, null, 2)}\n`,
        );
        await rename(stagingDirectory, finalDirectory);
      } catch (error) {
        await rm(stagingDirectory, { recursive: true, force: true }).catch(
          () => undefined,
        );
        throw error;
      }
      return clone(record);
    });
  }

  async get(id: string, includeArchived = false): Promise<LocalMediaRecord> {
    assertMediaId(id);
    const processedDirectory = this.pathFor(id);
    let usesProcessedDirectory = false;
    try {
      const directoryMetadata = await lstat(processedDirectory);
      if (
        !directoryMetadata.isDirectory() ||
        directoryMetadata.isSymbolicLink()
      ) {
        throw new LocalMediaStoreError(
          'INTEGRITY_FAILURE',
          'The processed media record is not a safe regular directory.',
        );
      }
      usesProcessedDirectory = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const metadataPath = usesProcessedDirectory
      ? this.pathFor(`${id}/metadata.json`)
      : this.pathFor(`${id}.json`);
    let raw: string;
    try {
      const metadataFile = await lstat(metadataPath);
      if (
        !metadataFile.isFile() ||
        metadataFile.isSymbolicLink() ||
        metadataFile.size < 1 ||
        metadataFile.size > maxMetadataBytes
      ) {
        throw new LocalMediaStoreError(
          'INTEGRITY_FAILURE',
          'Media metadata is not a safe bounded regular file.',
        );
      }
      raw = await readFile(metadataPath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new LocalMediaStoreError('MEDIA_NOT_FOUND', 'Media was not found.');
      }
      throw error;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new LocalMediaStoreError('INTEGRITY_FAILURE', 'Invalid media metadata JSON.');
    }
    assertRecord(parsed);
    if (parsed.id !== id) {
      throw new LocalMediaStoreError('INTEGRITY_FAILURE', 'Media ID mismatch.');
    }
    if ((parsed.processing !== undefined) !== usesProcessedDirectory) {
      throw new LocalMediaStoreError(
        'INTEGRITY_FAILURE',
        'Media storage layout does not match its processing metadata.',
      );
    }
    if (parsed.status === 'archived' && !includeArchived) {
      throw new LocalMediaStoreError('MEDIA_NOT_FOUND', 'Media was not found.');
    }

    const variants = parsed.processing?.variants ?? [
      {
        name: 'original' as const,
        contentType: parsed.contentType,
        storageKey: parsed.storageKey,
        byteLength: parsed.byteLength,
        sha256: parsed.sha256,
      },
    ];
    for (const variant of variants) {
      const contentPath = this.pathFor(variant.storageKey);
      let bytes: Uint8Array;
      try {
        const file = await lstat(contentPath);
        if (
          !file.isFile() ||
          file.isSymbolicLink() ||
          file.size !== variant.byteLength
        ) {
          throw new LocalMediaStoreError(
            'INTEGRITY_FAILURE',
            'Media size does not match metadata.',
          );
        }
        bytes = await readFile(contentPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new LocalMediaStoreError(
            'INTEGRITY_FAILURE',
            'Media content is missing.',
          );
        }
        throw error;
      }
      const outputRule = mediaRules[variant.contentType];
      if (
        digest(bytes) !== variant.sha256 ||
        !outputRule.signature(bytes)
      ) {
        throw new LocalMediaStoreError(
          'INTEGRITY_FAILURE',
          'Media content hash or signature does not match metadata.',
        );
      }
    }
    return clone(parsed);
  }

  async readVariant(
    id: string,
    name: LocalMediaVariantName,
  ): Promise<{
    record: LocalMediaRecord;
    variant: LocalMediaVariant;
    bytes: Uint8Array;
  }> {
    const record = await this.get(id);
    const variants = record.processing?.variants ?? [
      {
        name: 'original' as const,
        contentType: record.contentType,
        storageKey: record.storageKey,
        byteLength: record.byteLength,
        sha256: record.sha256,
      },
    ];
    const variant = variants.find((candidate) => candidate.name === name);
    if (!variant) {
      throw new LocalMediaStoreError(
        'MEDIA_NOT_FOUND',
        'The requested media variant was not found.',
      );
    }
    let bytes: Uint8Array;
    try {
      bytes = await readFile(this.pathFor(variant.storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new LocalMediaStoreError(
          'INTEGRITY_FAILURE',
          'Media disappeared while its verified variant was being read.',
        );
      }
      throw error;
    }
    if (
      bytes.byteLength !== variant.byteLength ||
      digest(bytes) !== variant.sha256 ||
      !mediaRules[variant.contentType].signature(bytes)
    ) {
      throw new LocalMediaStoreError(
        'INTEGRITY_FAILURE',
        'Media changed while its verified variant was being read.',
      );
    }
    return {
      record,
      variant: clone(variant),
      bytes,
    };
  }

  async list(includeArchived = false): Promise<LocalMediaRecord[]> {
    await this.initialize();
    const entries = await readdir(this.root, { withFileTypes: true });
    if (entries.length > maxStorageEntries) {
      throw new LocalMediaStoreError(
        'CAPACITY_EXCEEDED',
        'The local media store contains too many entries.',
      );
    }
    const ids = entries.flatMap((entry) => {
      if (entry.isDirectory() && mediaIdPattern.test(entry.name)) {
        return [entry.name];
      }
      if (
        entry.isFile() &&
        entry.name.endsWith('.json') &&
        mediaIdPattern.test(entry.name.replace(/\.json$/, ''))
      ) {
        return [entry.name.slice(0, -5)];
      }
      if (entry.isDirectory() && processedDirectoryPattern.test(entry.name)) {
        return [];
      }
      return [];
    });
    if (new Set(ids).size !== ids.length) {
      throw new LocalMediaStoreError(
        'INTEGRITY_FAILURE',
        'Duplicate legacy and processed media identifiers were found.',
      );
    }
    const records: LocalMediaRecord[] = [];
    for (const id of ids) {
      try {
        records.push(await this.get(id, includeArchived));
      } catch (error) {
        if (
          error instanceof LocalMediaStoreError &&
          error.code === 'MEDIA_NOT_FOUND' &&
          !includeArchived
        ) {
          continue;
        }
        throw error;
      }
    }
    return records.sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
    );
  }

  async archive(
    id: string,
    context?: LocalMediaMutationContext,
  ): Promise<LocalMediaRecord> {
    return this.serialize(async () => {
      const operation = normalizeMutationContext(context);
      const records = await this.list(true);
      this.assertRequestUnused(records, operation.requestId);
      const current = await this.get(id, true);
      if (current.status === 'archived') {
        throw new LocalMediaStoreError('MEDIA_ARCHIVED', 'Media is already archived.');
      }
      const occurredAt = assertClock(this.clock());
      const archived: LocalMediaRecord = {
        ...current,
        status: 'archived',
        archivedAt: occurredAt,
        updatedAt: occurredAt,
        revision: current.revision + 1,
        auditEvents: [
          ...current.auditEvents,
          {
            id: `media-audit-${String(current.revision + 1).padStart(6, '0')}`,
            action: 'archive',
            actorId: operation.actorId,
            requestId: operation.requestId,
            occurredAt,
            fromStatus: current.status,
            toStatus: 'archived',
          },
        ],
      };
      await writeAtomic(
        this.pathFor(
          current.processing === undefined ? `${id}.json` : `${id}/metadata.json`,
        ),
        `${JSON.stringify(archived, null, 2)}\n`,
      );
      return clone(archived);
    });
  }

  async restore(
    id: string,
    context?: LocalMediaMutationContext,
  ): Promise<LocalMediaRecord> {
    return this.serialize(async () => {
      const operation = normalizeMutationContext(context);
      const records = await this.list(true);
      this.assertRequestUnused(records, operation.requestId);
      const current = await this.get(id, true);
      if (current.status !== 'archived') {
        throw new LocalMediaStoreError(
          'INVALID_INPUT',
          'Only archived media can be restored.',
        );
      }
      const occurredAt = assertClock(this.clock());
      const restored: LocalMediaRecord = {
        ...current,
        status: 'active',
        archivedAt: undefined,
        updatedAt: occurredAt,
        revision: current.revision + 1,
        auditEvents: [
          ...current.auditEvents,
          {
            id: `media-audit-${String(current.revision + 1).padStart(6, '0')}`,
            action: 'restore',
            actorId: operation.actorId,
            requestId: operation.requestId,
            occurredAt,
            fromStatus: current.status,
            toStatus: 'active',
          },
        ],
      };
      await writeAtomic(
        this.pathFor(
          current.processing === undefined ? `${id}.json` : `${id}/metadata.json`,
        ),
        `${JSON.stringify(restored, null, 2)}\n`,
      );
      return clone(restored);
    });
  }

  private pathFor(name: string): string {
    const candidate = resolve(join(this.root, name));
    if (candidate === this.root || !candidate.startsWith(`${this.root}\\`) && !candidate.startsWith(`${this.root}/`)) {
      throw new LocalMediaStoreError('INVALID_INPUT', 'Unsafe media path.');
    }
    return candidate;
  }

  private assertRequestUnused(
    records: readonly LocalMediaRecord[],
    requestId: string,
  ): void {
    if (
      records.some((record) =>
        record.auditEvents.some((event) => event.requestId === requestId),
      )
    ) {
      throw new LocalMediaStoreError(
        'DUPLICATE_REQUEST',
        'The media mutation request was already committed.',
      );
    }
  }

  private async serialize<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.writeQueue;
    let release!: () => void;
    this.writeQueue = new Promise<void>((resolveQueue) => {
      release = resolveQueue;
    });
    await previous;
    try {
      await this.initialize();
      try {
        return await withLocalFileLock(this.root, operation);
      } catch (error) {
        if (
          error instanceof LocalFileLockError &&
          error.code === 'LOCK_BUSY'
        ) {
          throw new LocalMediaStoreError(
            'MEDIA_BUSY',
            'The local media store is already in use by another operation.',
          );
        }
        if (error instanceof LocalFileLockError) {
          throw new LocalMediaStoreError(
            'INTEGRITY_FAILURE',
            'The local media-store lock could not be acquired or released safely.',
          );
        }
        throw error;
      }
    } finally {
      release();
    }
  }
}
