import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createCycloneDxBom,
  serializeCycloneDxBom,
} from '../scripts/generate-sbom.ts';
import {
  DEFAULT_STANDALONE_ARTIFACT_BUDGETS,
  REQUIRED_BUILD_FILES,
  REQUIRED_STANDALONE_FILES,
  serializeBuildArtifactReport,
  validateBuildArtifact,
} from '../scripts/validate-build-artifact.ts';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sbomScript = join(repositoryRoot, 'scripts', 'generate-sbom.ts');
const artifactScript = join(
  repositoryRoot,
  'scripts',
  'validate-build-artifact.ts',
);

test('standalone budgets bound the 70-asset public beta payload without relaxing other limits', () => {
  assert.deepEqual(DEFAULT_STANDALONE_ARTIFACT_BUDGETS, {
    maxFileCount: 4_096,
    maxJavaScriptBytes: 32 * 1024 * 1024,
    maxMediaBytes: 64 * 1024 * 1024,
    maxSingleFileBytes: 4 * 1024 * 1024,
    maxStylesheetBytes: 1024 * 1024,
    maxTotalBytes: 96 * 1024 * 1024,
  });
});

function integrity(byte: number): string {
  return `sha512-${Buffer.alloc(64, byte).toString('base64')}`;
}

function lockFixture(): string {
  return `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      alpha:
        specifier: 1.0.0
        version: 1.0.0
    devDependencies:
      dev-only:
        specifier: 4.0.0
        version: 4.0.0

packages:

  alpha@1.0.0:
    resolution: {integrity: ${integrity(1)}}

  beta@2.0.0:
    resolution: {integrity: ${integrity(2)}}

  optional-lib@3.0.0:
    resolution: {integrity: ${integrity(3)}}

  dev-only@4.0.0:
    resolution: {integrity: ${integrity(4)}}

snapshots:

  alpha@1.0.0:
    dependencies:
      beta: 2.0.0
    optionalDependencies:
      optional-lib: 3.0.0

  beta@2.0.0: {}

  optional-lib@3.0.0: {}

  dev-only@4.0.0: {}
`;
}

function componentByLockKey(
  bom: ReturnType<typeof createCycloneDxBom>,
  lockKey: string,
) {
  return bom.components.find((component) =>
    component.properties.some(
      (property) =>
        property.name === 'pecadosvip:pnpm:lockfile-key' &&
        property.value === lockKey,
    ),
  );
}

async function temporaryDirectory(
  context: { after(callback: () => void): void },
  prefix: string,
): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  context.after(() => {
    void rm(directory, { recursive: true, force: true });
  });
  return directory;
}

async function createValidArtifact(root: string): Promise<void> {
  for (const requiredPath of REQUIRED_BUILD_FILES) {
    const path = join(root, ...requiredPath.split('/'));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${requiredPath}\n`, 'utf8');
  }
  const chunk = join(root, 'client', '_next', 'static', 'chunks', 'app.js');
  await mkdir(dirname(chunk), { recursive: true });
  await writeFile(chunk, 'export const release = true;\n', 'utf8');
}

async function createValidStandaloneArtifact(root: string): Promise<void> {
  for (const requiredPath of REQUIRED_STANDALONE_FILES) {
    const path = join(root, ...requiredPath.split('/'));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${requiredPath}\n`, 'utf8');
  }
}

test('creates a deterministic CycloneDX graph with hashes and dependency scopes', () => {
  const options = {
    lockfileText: lockFixture(),
    packageJson: { name: 'release-fixture', version: '1.2.3' },
  };
  const first = createCycloneDxBom(options);
  const second = createCycloneDxBom(options);
  const serialized = serializeCycloneDxBom(first);

  assert.equal(serialized, serializeCycloneDxBom(second));
  assert.equal(serialized.includes('timestamp'), false);
  assert.equal(serialized.includes('serialNumber'), false);
  assert.equal(first.specVersion, '1.6');
  assert.equal(first.components.length, 4);
  assert.equal(first.dependencies.length, 5);
  assert.equal(componentByLockKey(first, 'alpha@1.0.0')?.scope, 'required');
  assert.equal(componentByLockKey(first, 'beta@2.0.0')?.scope, 'required');
  assert.equal(
    componentByLockKey(first, 'optional-lib@3.0.0')?.scope,
    'optional',
  );
  assert.equal(componentByLockKey(first, 'dev-only@4.0.0')?.scope, 'excluded');
  assert.deepEqual(componentByLockKey(first, 'alpha@1.0.0')?.hashes, [
    { alg: 'SHA-512', content: Buffer.alloc(64, 1).toString('hex') },
  ]);
  const root = first.dependencies[0]!;
  assert.equal(root.dependsOn.length, 2);
  const alpha = componentByLockKey(first, 'alpha@1.0.0')!;
  const alphaGraph = first.dependencies.find(
    (dependency) => dependency.ref === alpha['bom-ref'],
  );
  assert.equal(alphaGraph?.dependsOn.length, 2);
});

test('project SBOM classifies the Vinext production server as runtime', async () => {
  const [lockfileText, packageJsonText] = await Promise.all([
    readFile(join(repositoryRoot, 'pnpm-lock.yaml'), 'utf8'),
    readFile(join(repositoryRoot, 'package.json'), 'utf8'),
  ]);
  const packageJson = JSON.parse(packageJsonText) as {
    dependencies?: Record<string, string>;
    name: string;
    version: string;
  };
  assert.equal(packageJson.dependencies?.vinext, '1.0.0-beta.3');

  const bom = createCycloneDxBom({ lockfileText, packageJson });
  const vinext = bom.components.find(
    (component) =>
      component.name === 'vinext' && component.version === '1.0.0-beta.3',
  );
  assert(vinext, 'Vinext must be represented in the project SBOM.');
  assert.equal(vinext.scope, 'required');
});

test('SBOM generation fails closed when a graph target is absent', () => {
  const invalidLock = lockFixture().replace(
    '      beta: 2.0.0',
    '      beta: 9.9.9',
  );
  assert.throws(
    () =>
      createCycloneDxBom({
        lockfileText: invalidLock,
        packageJson: { name: 'release-fixture', version: '1.2.3' },
      }),
    /Dependency target is absent from pnpm snapshots/u,
  );
});

test('SBOM CLI writes reproducible bytes and a matching SHA-256', async (context) => {
  const root = await temporaryDirectory(context, 'pecadosvip-sbom-test-');
  const lockfilePath = join(root, 'pnpm-lock.yaml');
  const packageJsonPath = join(root, 'package.json');
  const firstOutput = join(root, 'first.cdx.json');
  const secondOutput = join(root, 'second.cdx.json');
  await writeFile(lockfilePath, lockFixture(), 'utf8');
  await writeFile(
    packageJsonPath,
    `${JSON.stringify({ name: 'release-fixture', version: '1.2.3' })}\n`,
    'utf8',
  );

  const run = (output: string) =>
    spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        sbomScript,
        '--lockfile',
        lockfilePath,
        '--package',
        packageJsonPath,
        '--output',
        output,
      ],
      { cwd: repositoryRoot, encoding: 'utf8' },
    );
  const firstRun = run(firstOutput);
  const secondRun = run(secondOutput);
  assert.equal(firstRun.status, 0, firstRun.stderr);
  assert.equal(secondRun.status, 0, secondRun.stderr);
  const [firstBytes, secondBytes] = await Promise.all([
    readFile(firstOutput),
    readFile(secondOutput),
  ]);
  assert.deepEqual(firstBytes, secondBytes);
  const receipt = JSON.parse(firstRun.stdout) as { sha256: string };
  assert.equal(
    receipt.sha256,
    createHash('sha256').update(firstBytes).digest('hex'),
  );
});

test('build artifact validator produces a stable passing hash inventory', async (context) => {
  const root = await temporaryDirectory(context, 'pecadosvip-artifact-test-');
  await createValidArtifact(root);

  const first = await validateBuildArtifact({ rootDirectory: root });
  const second = await validateBuildArtifact({ rootDirectory: root });

  assert.equal(first.result, 'PASS');
  assert.deepEqual(first, second);
  assert.equal(first.violations.length, 0);
  assert.equal(first.requiredFiles.every((file) => file.present), true);
  const chunk = first.files.find(
    (file) => file.path === 'client/_next/static/chunks/app.js',
  );
  assert.equal(
    chunk?.sha256,
    createHash('sha256')
      .update('export const release = true;\n')
      .digest('hex'),
  );
  assert.equal(
    serializeBuildArtifactReport(first),
    serializeBuildArtifactReport(second),
  );
});

test('standalone artifact requires Vinext, its production server and runtime peers', async (context) => {
  const root = await temporaryDirectory(context, 'pecadosvip-standalone-test-');
  await createValidStandaloneArtifact(root);

  const report = await validateBuildArtifact({
    artifactProfile: 'standalone',
    rootDirectory: root,
  });

  assert.equal(report.result, 'PASS');
  assert.equal(report.artifactProfile, 'standalone');
  assert.equal(report.violations.length, 0);
  assert.equal(
    report.files.some((file) => file.path === 'node_modules/react/package.json'),
    true,
  );
  assert.equal(
    report.files.some(
      (file) => file.path === 'node_modules/vinext/dist/server/prod-server.js',
    ),
    true,
  );

  await rm(join(root, 'node_modules', 'scheduler', 'package.json'));
  await rm(join(root, 'node_modules', 'vinext', 'package.json'));
  await rm(join(root, 'node_modules', 'vinext', 'dist', 'server', 'prod-server.js'));
  await writeFile(
    join(root, 'node_modules', 'react', '.env.production'),
    'TOKEN=not-a-real-token\n',
    'utf8',
  );
  const invalid = await validateBuildArtifact({
    artifactProfile: 'standalone',
    rootDirectory: root,
  });
  assert.equal(invalid.result, 'FAIL');
  assert.equal(
    invalid.violations.some(
      (violation) =>
        violation.code === 'MISSING_REQUIRED_FILE' &&
        violation.path === 'node_modules/scheduler/package.json',
    ),
    true,
  );
  assert.equal(
    invalid.violations.some(
      (violation) =>
        violation.code === 'MISSING_REQUIRED_FILE' &&
        violation.path === 'node_modules/vinext/package.json',
    ),
    true,
  );
  assert.equal(
    invalid.violations.some(
      (violation) =>
        violation.code === 'MISSING_REQUIRED_FILE' &&
        violation.path === 'node_modules/vinext/dist/server/prod-server.js',
    ),
    true,
  );
  assert.equal(
    invalid.violations.some(
      (violation) =>
        violation.code === 'FORBIDDEN_PATH' &&
        violation.path === 'node_modules/react/.env.production',
    ),
    true,
  );
});

test('standalone artifact rejects image-size at every runtime nesting depth', async (context) => {
  const root = await temporaryDirectory(context, 'pecadosvip-standalone-build-only-test-');
  await createValidStandaloneArtifact(root);
  const directPackage = join(root, 'node_modules', 'image-size', 'package.json');
  const nestedPackage = join(
    root,
    'node_modules',
    'vinext',
    'node_modules',
    'image-size',
    'package.json',
  );
  await mkdir(dirname(directPackage), { recursive: true });
  await mkdir(dirname(nestedPackage), { recursive: true });
  await writeFile(directPackage, '{"name":"image-size","version":"2.0.2"}\n', 'utf8');
  await writeFile(nestedPackage, '{"name":"image-size","version":"2.0.2"}\n', 'utf8');

  const report = await validateBuildArtifact({
    artifactProfile: 'standalone',
    rootDirectory: root,
  });

  assert.equal(report.result, 'FAIL');
  assert.equal(report.policyVersion, 4);
  assert.equal(
    report.violations.some(
      (violation) =>
        violation.code === 'FORBIDDEN_PATH' &&
        violation.path === 'node_modules/image-size',
    ),
    true,
  );
  assert.equal(
    report.violations.some(
      (violation) =>
        violation.code === 'FORBIDDEN_PATH' &&
        violation.path === 'node_modules/vinext/node_modules/image-size',
    ),
    true,
  );
});

test('worker artifact exclusions are explicit and limited to top-level directories', async (context) => {
  const root = await temporaryDirectory(context, 'pecadosvip-worker-exclusion-test-');
  await createValidArtifact(root);
  const hiddenFile = join(root, 'standalone', 'node_modules', '.env.production');
  await mkdir(dirname(hiddenFile), { recursive: true });
  await writeFile(hiddenFile, 'TOKEN=not-a-real-token\n', 'utf8');

  const unexcluded = await validateBuildArtifact({ rootDirectory: root });
  assert.equal(unexcluded.result, 'FAIL');

  const excluded = await validateBuildArtifact({
    excludedTopLevelDirectories: ['standalone'],
    rootDirectory: root,
  });
  assert.equal(excluded.result, 'PASS');
  assert.deepEqual(excluded.excludedTopLevelDirectories, ['standalone']);
  assert.equal(
    excluded.files.some((file) => file.path.startsWith('standalone/')),
    false,
  );
});

test('build artifact validator rejects forbidden files and missing runtime files', async (context) => {
  const root = await temporaryDirectory(context, 'pecadosvip-artifact-test-');
  await createValidArtifact(root);
  await writeFile(join(root, '.env.production'), 'SECRET=value\n', 'utf8');
  await writeFile(join(root, 'client', 'bundle.js.map'), '{}\n', 'utf8');
  await writeFile(join(root, 'server', 'BUILD_ID'), '', 'utf8');

  const report = await validateBuildArtifact({
    requiredFiles: [...REQUIRED_BUILD_FILES, 'server/missing-runtime.js'],
    rootDirectory: root,
  });
  const violations = new Set(
    report.violations.map((violation) => `${violation.code}:${violation.path ?? ''}`),
  );

  assert.equal(report.result, 'FAIL');
  assert.equal(violations.has('FORBIDDEN_PATH:.env.production'), true);
  assert.equal(violations.has('FORBIDDEN_PATH:client/bundle.js.map'), true);
  assert.equal(
    violations.has('MISSING_REQUIRED_FILE:server/missing-runtime.js'),
    true,
  );
  assert.equal(violations.has('EMPTY_REQUIRED_FILE:server/BUILD_ID'), true);
});

test('build artifact validator enforces every byte and file-count budget', async (context) => {
  const root = await temporaryDirectory(context, 'pecadosvip-artifact-test-');
  await createValidArtifact(root);
  await writeFile(join(root, 'client', 'theme.css'), 'body { color: black; }\n', 'utf8');
  await writeFile(join(root, 'client', 'intro.mp4'), Buffer.alloc(32, 7));

  const report = await validateBuildArtifact({
    budgets: {
      maxFileCount: 1,
      maxJavaScriptBytes: 1,
      maxMediaBytes: 0,
      maxSingleFileBytes: 1,
      maxStylesheetBytes: 0,
      maxTotalBytes: 1,
    },
    rootDirectory: root,
  });
  const failedBudgets = report.budgets
    .filter((budget) => !budget.ok)
    .map((budget) => budget.name);

  assert.equal(report.result, 'FAIL');
  assert.equal(failedBudgets.includes('maxFileCount'), true);
  assert.equal(failedBudgets.includes('maxJavaScriptBytes'), true);
  assert.equal(failedBudgets.includes('maxMediaBytes'), true);
  assert.equal(failedBudgets.includes('maxSingleFileBytes'), true);
  assert.equal(failedBudgets.includes('maxStylesheetBytes'), true);
  assert.equal(failedBudgets.includes('maxTotalBytes'), true);
});

test('release CLIs reject output paths that alias protected inputs', async (context) => {
  const root = await temporaryDirectory(context, 'pecadosvip-release-alias-test-');
  const lockfilePath = join(root, 'pnpm-lock.yaml');
  const packageJsonPath = join(root, 'package.json');
  await writeFile(lockfilePath, lockFixture(), 'utf8');
  await writeFile(
    packageJsonPath,
    `${JSON.stringify({ name: 'release-fixture', version: '1.2.3' })}\n`,
    'utf8',
  );
  const sbomRun = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      sbomScript,
      '--lockfile',
      lockfilePath,
      '--package',
      packageJsonPath,
      '--output',
      lockfilePath,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
  assert.equal(sbomRun.status, 1);
  assert.match(sbomRun.stderr, /cannot alias package\.json or the pnpm lockfile/u);
  assert.equal(await readFile(lockfilePath, 'utf8'), lockFixture());

  const artifactRoot = join(root, 'dist');
  await createValidArtifact(artifactRoot);
  const protectedReportPath = join(repositoryRoot, 'package.json');
  const artifactRun = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      artifactScript,
      '--root',
      artifactRoot,
      '--report',
      protectedReportPath,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
  assert.equal(artifactRun.status, 1);
  assert.match(artifactRun.stderr, /dedicated build-artifact-report\.json/u);
});

test('build artifact validator rejects symbolic links without following them', async (context) => {
  const root = await temporaryDirectory(context, 'pecadosvip-artifact-test-');
  await createValidArtifact(root);
  const outside = join(dirname(root), `${root.split(/[\\/]/u).at(-1)}-outside.txt`);
  context.after(() => {
    void rm(outside, { force: true });
  });
  await writeFile(outside, 'outside\n', 'utf8');
  try {
    await symlink(outside, join(root, 'client', 'outside-link.txt'), 'file');
  } catch (error) {
    if (['EPERM', 'EACCES'].includes((error as NodeJS.ErrnoException).code ?? '')) {
      context.skip('The host does not permit creating test symbolic links.');
      return;
    }
    throw error;
  }

  const report = await validateBuildArtifact({ rootDirectory: root });
  assert.equal(report.result, 'FAIL');
  assert.equal(
    report.violations.some(
      (violation) =>
        violation.code === 'SYMLINK_REJECTED' &&
        violation.path === 'client/outside-link.txt',
    ),
    true,
  );
});

test('build artifact CLI writes the report outside the validated tree', async (context) => {
  const root = await temporaryDirectory(context, 'pecadosvip-artifact-test-');
  const artifactRoot = join(root, 'dist');
  const reportPath = join(root, 'evidence', 'build-artifact-report.json');
  await createValidArtifact(artifactRoot);

  const run = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      artifactScript,
      '--root',
      artifactRoot,
      '--report',
      reportPath,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as {
    result: string;
  };
  const receipt = JSON.parse(run.stdout) as {
    reportSha256: string;
    result: string;
  };
  assert.equal(report.result, 'PASS');
  assert.equal(receipt.result, 'build-artifact-valid');
  assert.equal(
    receipt.reportSha256,
    createHash('sha256').update(await readFile(reportPath)).digest('hex'),
  );
});

test('build artifact CLI exits non-zero but preserves a deterministic failure report', async (context) => {
  const root = await temporaryDirectory(context, 'pecadosvip-artifact-test-');
  const artifactRoot = join(root, 'dist');
  const reportPath = join(root, 'evidence', 'build-artifact-report.json');
  await createValidArtifact(artifactRoot);
  await writeFile(join(artifactRoot, '.env.local'), 'TOKEN=not-a-real-token\n', 'utf8');

  const run = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      artifactScript,
      '--root',
      artifactRoot,
      '--report',
      reportPath,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
  assert.equal(run.status, 1, run.stderr);
  const firstBytes = await readFile(reportPath);
  const report = JSON.parse(firstBytes.toString('utf8')) as {
    result: string;
    violations: Array<{ code: string; path?: string }>;
  };
  assert.equal(report.result, 'FAIL');
  assert.equal(
    report.violations.some(
      (violation) =>
        violation.code === 'FORBIDDEN_PATH' && violation.path === '.env.local',
    ),
    true,
  );

  const secondRun = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      artifactScript,
      '--root',
      artifactRoot,
      '--report',
      reportPath,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
  assert.equal(secondRun.status, 1, secondRun.stderr);
  assert.deepEqual(await readFile(reportPath), firstBytes);
});
