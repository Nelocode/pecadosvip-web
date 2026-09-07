import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type DependencyKind = 'development' | 'optional' | 'production';

type ImporterDependency = {
  kind: DependencyKind;
  name: string;
  reference: string;
};

type SnapshotDependency = {
  name: string;
  optional: boolean;
  reference: string;
};

type ParsedPnpmLock = {
  importDependencies: ImporterDependency[];
  integrities: Map<string, string>;
  lockfileVersion: string;
  snapshots: Map<string, SnapshotDependency[]>;
};

type CycloneDxHash = {
  alg: 'SHA-256' | 'SHA-384' | 'SHA-512';
  content: string;
};

type CycloneDxComponent = {
  type: 'library';
  'bom-ref': string;
  group?: string;
  hashes: CycloneDxHash[];
  name: string;
  purl: string;
  properties: Array<{ name: string; value: string }>;
  scope: 'excluded' | 'optional' | 'required';
  version: string;
};

type CycloneDxDependency = {
  ref: string;
  dependsOn: string[];
};

export type CycloneDxBom = {
  $schema: 'http://cyclonedx.org/schema/bom-1.6.schema.json';
  bomFormat: 'CycloneDX';
  components: CycloneDxComponent[];
  dependencies: CycloneDxDependency[];
  metadata: {
    component: {
      type: 'application';
      'bom-ref': string;
      name: string;
      purl: string;
      version: string;
    };
    properties: Array<{ name: string; value: string }>;
  };
  specVersion: '1.6';
  version: 1;
};

export type GenerateSbomOptions = {
  lockfilePath: string;
  outputPath: string;
  packageJsonPath: string;
};

const IMPORTER_KIND_BY_SECTION: Readonly<Record<string, DependencyKind>> = {
  dependencies: 'production',
  devDependencies: 'development',
  optionalDependencies: 'optional',
};

const SCOPE_RANK = {
  excluded: 0,
  optional: 1,
  required: 2,
} as const;

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function indentation(line: string): number {
  return line.length - line.trimStart().length;
}

function decodeYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const decoded = JSON.parse(trimmed) as unknown;
    if (typeof decoded !== 'string') {
      throw new Error(`Expected a YAML string scalar, received ${trimmed}.`);
    }
    return decoded;
  }
  return trimmed;
}

function splitYamlMapping(line: string): { key: string; value?: string } | null {
  const trimmed = line.trim();
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;

  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (doubleQuoted && character === '\\') {
      escaped = true;
      continue;
    }
    if (!doubleQuoted && character === "'") {
      singleQuoted = !singleQuoted;
      continue;
    }
    if (!singleQuoted && character === '"') {
      doubleQuoted = !doubleQuoted;
      continue;
    }
    if (!singleQuoted && !doubleQuoted && character === ':') {
      const rawKey = trimmed.slice(0, index);
      const rawValue = trimmed.slice(index + 1).trim();
      return {
        key: decodeYamlScalar(rawKey),
        value: rawValue ? decodeYamlScalar(rawValue) : undefined,
      };
    }
  }
  return null;
}

function packageBaseKey(snapshotKey: string): string {
  const peerContextIndex = snapshotKey.indexOf('(');
  return peerContextIndex === -1
    ? snapshotKey
    : snapshotKey.slice(0, peerContextIndex);
}

function parsePackageIdentity(snapshotKey: string): {
  group?: string;
  name: string;
  packageName: string;
  version: string;
} {
  const baseKey = packageBaseKey(snapshotKey);
  const versionDelimiter = baseKey.lastIndexOf('@');
  if (versionDelimiter <= 0 || versionDelimiter === baseKey.length - 1) {
    throw new Error(`Unsupported pnpm package key: ${snapshotKey}.`);
  }
  const packageName = baseKey.slice(0, versionDelimiter);
  const version = baseKey.slice(versionDelimiter + 1);
  if (packageName.startsWith('@')) {
    const slashIndex = packageName.indexOf('/');
    if (slashIndex <= 1 || slashIndex === packageName.length - 1) {
      throw new Error(`Unsupported scoped package name: ${packageName}.`);
    }
    return {
      group: packageName.slice(0, slashIndex),
      name: packageName.slice(slashIndex + 1),
      packageName,
      version,
    };
  }
  return { name: packageName, packageName, version };
}

function packagePurl(packageName: string, version: string): string {
  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.split('/');
    if (!scope || !name) {
      throw new Error(`Unsupported scoped package name: ${packageName}.`);
    }
    return `pkg:npm/${encodeURIComponent(scope)}/${encodeURIComponent(name)}@${encodeURIComponent(version)}`;
  }
  return `pkg:npm/${encodeURIComponent(packageName)}@${encodeURIComponent(version)}`;
}

function snapshotBomRef(snapshotKey: string): string {
  return `urn:cdx:pnpm:${sha256(snapshotKey)}`;
}

function parseIntegrity(integrity: string): CycloneDxHash {
  const candidates = integrity
    .split(/\s+/u)
    .map((candidate) => {
      const delimiter = candidate.indexOf('-');
      if (delimiter <= 0 || delimiter === candidate.length - 1) {
        return null;
      }
      return {
        algorithm: candidate.slice(0, delimiter).toLowerCase(),
        encoded: candidate.slice(delimiter + 1),
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  const preferred =
    candidates.find((candidate) => candidate.algorithm === 'sha512') ??
    candidates.find((candidate) => candidate.algorithm === 'sha384') ??
    candidates.find((candidate) => candidate.algorithm === 'sha256');
  if (!preferred) {
    throw new Error(`Unsupported or missing SRI hash: ${integrity}.`);
  }
  const bytes = Buffer.from(preferred.encoded, 'base64');
  const expectedBytes = { sha256: 32, sha384: 48, sha512: 64 }[preferred.algorithm];
  if (bytes.byteLength !== expectedBytes) {
    throw new Error(`Invalid ${preferred.algorithm} integrity length.`);
  }
  const algorithm = {
    sha256: 'SHA-256',
    sha384: 'SHA-384',
    sha512: 'SHA-512',
  }[preferred.algorithm] as CycloneDxHash['alg'];
  return { alg: algorithm, content: bytes.toString('hex') };
}

function parsePnpmLock(lockfileText: string): ParsedPnpmLock {
  const lines = lockfileText.replaceAll('\r\n', '\n').split('\n');
  const integrities = new Map<string, string>();
  const snapshots = new Map<string, SnapshotDependency[]>();
  const importDependencies = new Map<string, ImporterDependency>();
  let topLevelSection = '';
  let lockfileVersion = '';
  let currentPackage = '';
  let currentSnapshot = '';
  let snapshotDependencySection = '';
  let currentImporter = '';
  let importerDependencySection = '';
  let importerDependencyName = '';

  const recordImporterDependency = (name: string, reference: string): void => {
    const kind = IMPORTER_KIND_BY_SECTION[importerDependencySection];
    if (!kind || !name || !reference) {
      return;
    }
    const previous = importDependencies.get(name);
    const priority: Record<DependencyKind, number> = {
      development: 0,
      optional: 1,
      production: 2,
    };
    if (!previous || priority[kind] > priority[previous.kind]) {
      importDependencies.set(name, { kind, name, reference });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const indent = indentation(line);
    const mapping = splitYamlMapping(line);
    if (!mapping) {
      continue;
    }

    if (indent === 0) {
      topLevelSection = mapping.value === undefined ? mapping.key : '';
      currentPackage = '';
      currentSnapshot = '';
      currentImporter = '';
      snapshotDependencySection = '';
      importerDependencySection = '';
      importerDependencyName = '';
      if (mapping.key === 'lockfileVersion' && mapping.value) {
        lockfileVersion = mapping.value;
      }
      continue;
    }

    if (topLevelSection === 'packages') {
      if (indent === 2 && mapping.value === undefined) {
        currentPackage = mapping.key;
        continue;
      }
      if (indent === 4 && currentPackage && mapping.key === 'resolution' && mapping.value) {
        const integrityMatch = /(?:^|[{,]\s*)integrity:\s*([^,}\s]+)/u.exec(
          mapping.value,
        );
        if (integrityMatch?.[1]) {
          integrities.set(currentPackage, decodeYamlScalar(integrityMatch[1]));
        }
      }
      continue;
    }

    if (topLevelSection === 'snapshots') {
      if (
        indent === 2 &&
        (mapping.value === undefined || mapping.value === '{}')
      ) {
        currentSnapshot = mapping.key;
        snapshots.set(currentSnapshot, []);
        snapshotDependencySection = '';
        continue;
      }
      if (indent === 4) {
        snapshotDependencySection =
          mapping.value === undefined &&
          ['dependencies', 'optionalDependencies'].includes(mapping.key)
            ? mapping.key
            : '';
        continue;
      }
      if (
        indent === 6 &&
        currentSnapshot &&
        snapshotDependencySection &&
        mapping.value
      ) {
        snapshots.get(currentSnapshot)!.push({
          name: mapping.key,
          optional: snapshotDependencySection === 'optionalDependencies',
          reference: mapping.value,
        });
      }
      continue;
    }

    if (topLevelSection === 'importers') {
      if (indent === 2 && mapping.value === undefined) {
        currentImporter = mapping.key;
        importerDependencySection = '';
        importerDependencyName = '';
        continue;
      }
      if (currentImporter !== '.') {
        continue;
      }
      if (indent === 4) {
        importerDependencySection =
          mapping.value === undefined && mapping.key in IMPORTER_KIND_BY_SECTION
            ? mapping.key
            : '';
        importerDependencyName = '';
        continue;
      }
      if (indent === 6 && importerDependencySection) {
        importerDependencyName = mapping.key;
        if (mapping.value) {
          recordImporterDependency(mapping.key, mapping.value);
        }
        continue;
      }
      if (
        indent === 8 &&
        importerDependencyName &&
        mapping.key === 'version' &&
        mapping.value
      ) {
        recordImporterDependency(importerDependencyName, mapping.value);
      }
    }
  }

  if (!lockfileVersion) {
    throw new Error('pnpm lockfileVersion is missing.');
  }
  if (snapshots.size === 0) {
    throw new Error('pnpm snapshots graph is empty or unsupported.');
  }
  if (importDependencies.size === 0) {
    throw new Error('Root pnpm importer dependencies are missing or unsupported.');
  }

  const resolveTarget = (name: string, reference: string): string => {
    if (/^(?:file|link|workspace):/u.test(reference)) {
      throw new Error(`Local pnpm dependency references are unsupported: ${name} -> ${reference}.`);
    }
    const target = `${name}@${reference}`;
    if (!snapshots.has(target)) {
      throw new Error(`Dependency target is absent from pnpm snapshots: ${target}.`);
    }
    return target;
  };

  for (const dependency of importDependencies.values()) {
    resolveTarget(dependency.name, dependency.reference);
  }
  for (const [snapshotKey, dependencies] of snapshots) {
    for (const dependency of dependencies) {
      try {
        resolveTarget(dependency.name, dependency.reference);
      } catch (error) {
        throw new Error(`${snapshotKey}: ${(error as Error).message}`, { cause: error });
      }
    }
  }

  return {
    importDependencies: [...importDependencies.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
    integrities,
    lockfileVersion,
    snapshots,
  };
}

function dependencyScopeRanks(lock: ParsedPnpmLock): Map<string, number> {
  const ranks = new Map<string, number>();
  const queue: Array<{ rank: number; snapshotKey: string }> = [];
  for (const dependency of lock.importDependencies) {
    const snapshotKey = `${dependency.name}@${dependency.reference}`;
    const rank =
      dependency.kind === 'production'
        ? SCOPE_RANK.required
        : dependency.kind === 'optional'
          ? SCOPE_RANK.optional
          : SCOPE_RANK.excluded;
    queue.push({ rank, snapshotKey });
  }

  for (let index = 0; index < queue.length; index += 1) {
    const { rank, snapshotKey } = queue[index]!;
    if ((ranks.get(snapshotKey) ?? -1) >= rank) {
      continue;
    }
    ranks.set(snapshotKey, rank);
    for (const dependency of lock.snapshots.get(snapshotKey) ?? []) {
      const childRank =
        rank === SCOPE_RANK.required && dependency.optional
          ? SCOPE_RANK.optional
          : rank;
      queue.push({
        rank: childRank,
        snapshotKey: `${dependency.name}@${dependency.reference}`,
      });
    }
  }
  return ranks;
}

export function createCycloneDxBom(options: {
  lockfileText: string;
  packageJson: { name?: unknown; version?: unknown };
}): CycloneDxBom {
  const { lockfileText, packageJson } = options;
  if (typeof packageJson.name !== 'string' || !packageJson.name.trim()) {
    throw new Error('package.json name must be a non-empty string.');
  }
  if (typeof packageJson.version !== 'string' || !packageJson.version.trim()) {
    throw new Error('package.json version must be a non-empty string.');
  }
  const projectName = packageJson.name.trim();
  const projectVersion = packageJson.version.trim();
  const lock = parsePnpmLock(lockfileText);
  const ranks = dependencyScopeRanks(lock);
  const rootRef = packagePurl(projectName, projectVersion);
  const snapshotKeys = [...lock.snapshots.keys()].sort((left, right) =>
    left.localeCompare(right),
  );

  const components = snapshotKeys.map((snapshotKey): CycloneDxComponent => {
    const identity = parsePackageIdentity(snapshotKey);
    const baseKey = packageBaseKey(snapshotKey);
    const integrity = lock.integrities.get(baseKey);
    if (!integrity) {
      throw new Error(`Registry integrity is missing for pnpm package ${baseKey}.`);
    }
    const rank = ranks.get(snapshotKey) ?? SCOPE_RANK.excluded;
    const scope =
      rank === SCOPE_RANK.required
        ? 'required'
        : rank === SCOPE_RANK.optional
          ? 'optional'
          : 'excluded';
    return {
      type: 'library',
      'bom-ref': snapshotBomRef(snapshotKey),
      ...(identity.group ? { group: identity.group } : {}),
      hashes: [parseIntegrity(integrity)],
      name: identity.name,
      purl: packagePurl(identity.packageName, identity.version),
      properties: [
        { name: 'pecadosvip:pnpm:lockfile-key', value: snapshotKey },
      ],
      scope,
      version: identity.version,
    };
  });

  const rootDependsOn = lock.importDependencies
    .map((dependency) =>
      snapshotBomRef(`${dependency.name}@${dependency.reference}`),
    )
    .sort();
  const dependencies: CycloneDxDependency[] = [
    { ref: rootRef, dependsOn: rootDependsOn },
    ...snapshotKeys.map((snapshotKey) => ({
      ref: snapshotBomRef(snapshotKey),
      dependsOn: [...new Set(
        lock.snapshots
          .get(snapshotKey)!
          .map((dependency) =>
            snapshotBomRef(`${dependency.name}@${dependency.reference}`),
          ),
      )].sort(),
    })),
  ];

  return {
    $schema: 'http://cyclonedx.org/schema/bom-1.6.schema.json',
    bomFormat: 'CycloneDX',
    components,
    dependencies,
    metadata: {
      component: {
        type: 'application',
        'bom-ref': rootRef,
        name: projectName,
        purl: rootRef,
        version: projectVersion,
      },
      properties: [
        { name: 'pecadosvip:source:lockfile', value: 'pnpm-lock.yaml' },
        {
          name: 'pecadosvip:source:lockfile-sha256',
          value: sha256(lockfileText),
        },
        {
          name: 'pecadosvip:pnpm:lockfile-version',
          value: lock.lockfileVersion,
        },
      ],
    },
    specVersion: '1.6',
    version: 1,
  };
}

export function serializeCycloneDxBom(bom: CycloneDxBom): string {
  return `${JSON.stringify(bom, null, 2)}\n`;
}

async function assertRegularInput(path: string, label: string): Promise<void> {
  const stats = await lstat(path);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`${label} must be a regular file, not a symbolic link.`);
  }
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  try {
    const existing = await lstat(path);
    if (existing.isSymbolicLink() || !existing.isFile()) {
      throw new Error('SBOM output path must be a regular file or absent.');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  const temporaryPath = `${path}.tmp-${process.pid}`;
  try {
    await writeFile(temporaryPath, contents, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function generateCycloneDxSbom(
  options: GenerateSbomOptions,
): Promise<{ bom: CycloneDxBom; bytes: Uint8Array; sha256: string }> {
  const lockfilePath = resolve(options.lockfilePath);
  const packageJsonPath = resolve(options.packageJsonPath);
  const outputPath = resolve(options.outputPath);
  const normalizeComparablePath = (path: string): string =>
    process.platform === 'win32' ? path.toLowerCase() : path;
  if (
    [lockfilePath, packageJsonPath]
      .map(normalizeComparablePath)
      .includes(normalizeComparablePath(outputPath))
  ) {
    throw new Error('SBOM output path cannot alias package.json or the pnpm lockfile.');
  }
  await Promise.all([
    assertRegularInput(lockfilePath, 'pnpm lockfile'),
    assertRegularInput(packageJsonPath, 'package.json'),
  ]);
  const [lockfileText, packageJsonText] = await Promise.all([
    readFile(lockfilePath, 'utf8'),
    readFile(packageJsonPath, 'utf8'),
  ]);
  const packageJson = JSON.parse(packageJsonText) as {
    name?: unknown;
    version?: unknown;
  };
  const bom = createCycloneDxBom({ lockfileText, packageJson });
  const serialized = serializeCycloneDxBom(bom);
  const bytes = Buffer.from(serialized, 'utf8');
  await writeAtomic(outputPath, serialized);
  return { bom, bytes, sha256: sha256(bytes) };
}

function readCliOption(arguments_: string[], name: string): string | undefined {
  const index = arguments_.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = arguments_[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a path.`);
  }
  return value;
}

function isMainModule(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) {
    return false;
  }
  return resolve(entrypoint).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
}

async function main(): Promise<void> {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const lockfilePath = resolve(
    readCliOption(process.argv.slice(2), '--lockfile') ??
      resolve(repositoryRoot, 'pnpm-lock.yaml'),
  );
  const packageJsonPath = resolve(
    readCliOption(process.argv.slice(2), '--package') ??
      resolve(repositoryRoot, 'package.json'),
  );
  const outputPath = resolve(
    readCliOption(process.argv.slice(2), '--output') ??
      resolve(repositoryRoot, 'output', 'release', 'sbom.cdx.json'),
  );
  const result = await generateCycloneDxSbom({
    lockfilePath,
    outputPath,
    packageJsonPath,
  });
  const printableOutput = relative(repositoryRoot, outputPath).replaceAll('\\', '/');
  process.stdout.write(
    `${JSON.stringify({
      result: 'cyclonedx-sbom-created',
      output: printableOutput.startsWith('..') ? outputPath : printableOutput,
      componentCount: result.bom.components.length,
      dependencyNodeCount: result.bom.dependencies.length,
      sha256: result.sha256,
    })}\n`,
  );
}

if (isMainModule()) {
  await main().catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        result: 'cyclonedx-sbom-failed',
        error: error instanceof Error ? error.message : String(error),
      })}\n`,
    );
    process.exitCode = 1;
  });
}
