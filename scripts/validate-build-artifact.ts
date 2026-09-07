import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  lstat,
  mkdir,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export type BuildArtifactBudgets = {
  maxFileCount: number;
  maxJavaScriptBytes: number;
  maxMediaBytes: number;
  maxSingleFileBytes: number;
  maxStylesheetBytes: number;
  maxTotalBytes: number;
};

export const DEFAULT_BUILD_ARTIFACT_BUDGETS: Readonly<BuildArtifactBudgets> =
  Object.freeze({
    maxFileCount: 512,
    maxJavaScriptBytes: 4 * 1024 * 1024,
    maxMediaBytes: 4 * 1024 * 1024,
    maxSingleFileBytes: 2 * 1024 * 1024,
    maxStylesheetBytes: 512 * 1024,
    maxTotalBytes: 8 * 1024 * 1024,
  });

export const DEFAULT_STANDALONE_ARTIFACT_BUDGETS: Readonly<BuildArtifactBudgets> =
  Object.freeze({
    // The public beta has 70 exact allowlisted media assets (~49.86 MiB).
    // These rounded ceilings retain bounded deployment headroom without
    // relaxing file-count, JavaScript, stylesheet or single-file limits.
    maxFileCount: 4_096,
    maxJavaScriptBytes: 32 * 1024 * 1024,
    maxMediaBytes: 64 * 1024 * 1024,
    maxSingleFileBytes: 4 * 1024 * 1024,
    maxStylesheetBytes: 1024 * 1024,
    maxTotalBytes: 96 * 1024 * 1024,
  });

export const REQUIRED_BUILD_FILES = Object.freeze([
  '.openai/hosting.json',
  'client/.vite/manifest.json',
  'client/_headers',
  'server/.vite/manifest.json',
  'server/BUILD_ID',
  'server/index.js',
  'server/wrangler.json',
]);

export const REQUIRED_STANDALONE_FILES = Object.freeze([
  'server.js',
  'package.json',
  'node_modules/react/package.json',
  'node_modules/react-dom/package.json',
  'node_modules/scheduler/package.json',
  'node_modules/vinext/package.json',
  'node_modules/vinext/dist/server/prod-server.js',
  'dist/client/.vite/manifest.json',
  'dist/server/.vite/manifest.json',
  'dist/server/BUILD_ID',
  'dist/server/index.js',
]);

export type BuildArtifactProfile = 'standalone' | 'worker';

type ArtifactFile = {
  byteLength: number;
  path: string;
  sha256: string;
};

type ArtifactViolation = {
  code:
    | 'BUDGET_EXCEEDED'
    | 'CASE_COLLISION'
    | 'EMPTY_REQUIRED_FILE'
    | 'FORBIDDEN_PATH'
    | 'MISSING_REQUIRED_FILE'
    | 'NON_REGULAR_ENTRY'
    | 'SYMLINK_REJECTED';
  detail: string;
  path?: string;
};

type BudgetResult = {
  actual: number;
  limit: number;
  name: keyof BuildArtifactBudgets;
  ok: boolean;
};

export type BuildArtifactReport = {
  schema: 'pecadosvip.build-artifact-report';
  version: 2;
  policyVersion: 4;
  artifactProfile: BuildArtifactProfile;
  excludedTopLevelDirectories: string[];
  result: 'FAIL' | 'PASS';
  budgets: BudgetResult[];
  files: ArtifactFile[];
  requiredFiles: Array<{ path: string; present: boolean }>;
  summary: {
    fileCount: number;
    javascriptBytes: number;
    mediaBytes: number;
    stylesheetBytes: number;
    totalBytes: number;
  };
  violations: ArtifactViolation[];
};

export type ValidateBuildArtifactOptions = {
  artifactProfile?: BuildArtifactProfile;
  budgets?: Partial<BuildArtifactBudgets>;
  excludedTopLevelDirectories?: readonly string[];
  requiredFiles?: readonly string[];
  rootDirectory: string;
};

const FORBIDDEN_DIRECTORY_NAMES = new Set([
  '.git',
  'compliance',
  'evidence',
  'node_modules',
  'scripts',
  'stage-archives',
  'tests',
]);

const FORBIDDEN_EXACT_FILENAMES = new Set([
  '.npmrc',
  '.pnpmfile.cjs',
  'credentials.json',
  'id_ed25519',
  'id_rsa',
  'package-lock.json',
  'pnpm-lock.yaml',
  'secrets.json',
  'yarn.lock',
]);

const FORBIDDEN_EXTENSIONS = new Set([
  '.db',
  '.jks',
  '.key',
  '.keystore',
  '.log',
  '.map',
  '.p12',
  '.pem',
  '.pfx',
  '.sqlite',
  '.sqlite3',
]);

const JAVASCRIPT_EXTENSIONS = new Set(['.cjs', '.js', '.mjs']);
const MEDIA_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.m4a',
  '.mp3',
  '.mp4',
  '.ogg',
  '.otf',
  '.png',
  '.svg',
  '.ttf',
  '.wav',
  '.webm',
  '.webp',
  '.woff',
  '.woff2',
]);

function normalizedPath(path: string): string {
  return path.replaceAll('\\', '/');
}

function fileExtension(path: string): string {
  const filename = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex <= 0 ? '' : filename.slice(dotIndex);
}

function forbiddenPathReason(
  path: string,
  artifactProfile: BuildArtifactProfile,
): string | null {
  const normalized = normalizedPath(path);
  const segments = normalized.split('/');
  const lowerSegments = segments.map((segment) => segment.toLowerCase());
  const filename = lowerSegments.at(-1) ?? '';
  const extension = fileExtension(normalized);
  if (
    artifactProfile === 'standalone' &&
    lowerSegments.some(
      (segment, index) =>
        segment === 'node_modules' && lowerSegments[index + 1] === 'image-size',
    )
  ) {
    return "build-only package 'image-size'";
  }
  const forbiddenDirectory = lowerSegments
    .slice(0, -1)
    .find((segment) => FORBIDDEN_DIRECTORY_NAMES.has(segment));
  if (
    forbiddenDirectory &&
    !(artifactProfile === 'standalone' && forbiddenDirectory === 'node_modules')
  ) {
    return `forbidden runtime directory '${forbiddenDirectory}'`;
  }
  if (filename === '.env' || filename.startsWith('.env.')) {
    return 'environment file';
  }
  if (FORBIDDEN_EXACT_FILENAMES.has(filename)) {
    return `forbidden filename '${filename}'`;
  }
  if (/^service[-_.]?account.*\.json$/u.test(filename)) {
    return 'service-account credential file';
  }
  if (FORBIDDEN_EXTENSIONS.has(extension)) {
    return `forbidden extension '${extension}'`;
  }
  return null;
}

async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((fulfill, reject) => {
    const input = createReadStream(path);
    input.on('data', (chunk) => hash.update(chunk));
    input.on('error', reject);
    input.on('end', fulfill);
  });
  return hash.digest('hex');
}

function numericBudgets(
  overrides: Partial<BuildArtifactBudgets> | undefined,
  artifactProfile: BuildArtifactProfile,
): BuildArtifactBudgets {
  const defaults =
    artifactProfile === 'standalone'
      ? DEFAULT_STANDALONE_ARTIFACT_BUDGETS
      : DEFAULT_BUILD_ARTIFACT_BUDGETS;
  const budgets = { ...defaults, ...overrides };
  for (const [name, value] of Object.entries(budgets)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${name} must be a non-negative safe integer.`);
    }
  }
  return budgets;
}

async function collectArtifactFiles(
  rootDirectory: string,
  violations: ArtifactViolation[],
  artifactProfile: BuildArtifactProfile,
  excludedTopLevelDirectories: ReadonlySet<string>,
): Promise<ArtifactFile[]> {
  const files: ArtifactFile[] = [];
  const caseFoldedPaths = new Map<string, string>();

  const visit = async (directory: string, topLevel = false): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (
        topLevel &&
        entry.isDirectory() &&
        excludedTopLevelDirectories.has(entry.name.toLocaleLowerCase('en-US'))
      ) {
        continue;
      }
      const absolutePath = resolve(directory, entry.name);
      const artifactPath = normalizedPath(relative(rootDirectory, absolutePath));
      const statsBefore = await lstat(absolutePath);
      if (statsBefore.isSymbolicLink()) {
        violations.push({
          code: 'SYMLINK_REJECTED',
          detail: 'Symbolic links are not permitted in release artifacts.',
          path: artifactPath,
        });
        continue;
      }
      if (statsBefore.isDirectory()) {
        const forbiddenReason = forbiddenPathReason(
          `${artifactPath}/placeholder`,
          artifactProfile,
        );
        if (forbiddenReason) {
          violations.push({
            code: 'FORBIDDEN_PATH',
            detail: forbiddenReason,
            path: artifactPath,
          });
        }
        await visit(absolutePath);
        continue;
      }
      if (!statsBefore.isFile()) {
        violations.push({
          code: 'NON_REGULAR_ENTRY',
          detail: 'Only regular files and directories are permitted.',
          path: artifactPath,
        });
        continue;
      }
      const folded = artifactPath.toLocaleLowerCase('en-US');
      const existing = caseFoldedPaths.get(folded);
      if (existing && existing !== artifactPath) {
        violations.push({
          code: 'CASE_COLLISION',
          detail: `Path collides case-insensitively with '${existing}'.`,
          path: artifactPath,
        });
      } else {
        caseFoldedPaths.set(folded, artifactPath);
      }
      const forbiddenReason = forbiddenPathReason(artifactPath, artifactProfile);
      if (forbiddenReason) {
        violations.push({
          code: 'FORBIDDEN_PATH',
          detail: forbiddenReason,
          path: artifactPath,
        });
      }
      const digest = await hashFile(absolutePath);
      const statsAfter = await lstat(absolutePath);
      if (
        statsAfter.isSymbolicLink() ||
        !statsAfter.isFile() ||
        statsAfter.size !== statsBefore.size ||
        statsAfter.mtimeMs !== statsBefore.mtimeMs
      ) {
        throw new Error(`Build artifact changed while hashing: ${artifactPath}.`);
      }
      files.push({
        byteLength: statsAfter.size,
        path: artifactPath,
        sha256: digest,
      });
    }
  };

  await visit(rootDirectory, true);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export async function validateBuildArtifact(
  options: ValidateBuildArtifactOptions,
): Promise<BuildArtifactReport> {
  const rootDirectory = resolve(options.rootDirectory);
  const rootStats = await lstat(rootDirectory);
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new Error('Build root must be a regular directory, not a symbolic link.');
  }
  const artifactProfile = options.artifactProfile ?? 'worker';
  const excludedTopLevelDirectories = [
    ...(options.excludedTopLevelDirectories ?? []),
  ]
    .map((directory) => {
      const normalized = normalizedPath(directory).toLocaleLowerCase('en-US');
      if (
        normalized.length === 0 ||
        normalized === '.' ||
        normalized === '..' ||
        normalized.includes('/')
      ) {
        throw new Error(
          'Excluded top-level directories must be non-empty single path segments.',
        );
      }
      return normalized;
    })
    .sort();
  const uniqueExcludedTopLevelDirectories = [
    ...new Set(excludedTopLevelDirectories),
  ];
  const budgets = numericBudgets(options.budgets, artifactProfile);
  const defaultRequiredFiles =
    artifactProfile === 'standalone'
      ? REQUIRED_STANDALONE_FILES
      : REQUIRED_BUILD_FILES;
  const requiredFiles = [...(options.requiredFiles ?? defaultRequiredFiles)]
    .map(normalizedPath)
    .sort();
  const violations: ArtifactViolation[] = [];
  const files = await collectArtifactFiles(
    rootDirectory,
    violations,
    artifactProfile,
    new Set(uniqueExcludedTopLevelDirectories),
  );
  const filesByPath = new Map(files.map((file) => [file.path, file]));
  const requiredFileResults = requiredFiles.map((path) => ({
    path,
    present: filesByPath.has(path),
  }));
  for (const required of requiredFileResults) {
    if (!required.present) {
      violations.push({
        code: 'MISSING_REQUIRED_FILE',
        detail: 'Required runtime file is absent.',
        path: required.path,
      });
    } else if (filesByPath.get(required.path)?.byteLength === 0) {
      violations.push({
        code: 'EMPTY_REQUIRED_FILE',
        detail: 'Required runtime file must not be empty.',
        path: required.path,
      });
    }
  }

  const summary = files.reduce(
    (totals, file) => {
      const extension = fileExtension(file.path);
      totals.totalBytes += file.byteLength;
      if (JAVASCRIPT_EXTENSIONS.has(extension)) {
        totals.javascriptBytes += file.byteLength;
      } else if (extension === '.css') {
        totals.stylesheetBytes += file.byteLength;
      } else if (MEDIA_EXTENSIONS.has(extension)) {
        totals.mediaBytes += file.byteLength;
      }
      return totals;
    },
    {
      fileCount: files.length,
      javascriptBytes: 0,
      mediaBytes: 0,
      stylesheetBytes: 0,
      totalBytes: 0,
    },
  );
  const largestFileBytes = files.reduce(
    (largest, file) => Math.max(largest, file.byteLength),
    0,
  );
  const actualByBudget: Record<keyof BuildArtifactBudgets, number> = {
    maxFileCount: summary.fileCount,
    maxJavaScriptBytes: summary.javascriptBytes,
    maxMediaBytes: summary.mediaBytes,
    maxSingleFileBytes: largestFileBytes,
    maxStylesheetBytes: summary.stylesheetBytes,
    maxTotalBytes: summary.totalBytes,
  };
  const budgetResults = (
    Object.keys(budgets) as Array<keyof BuildArtifactBudgets>
  )
    .sort()
    .map((name) => ({
      actual: actualByBudget[name],
      limit: budgets[name],
      name,
      ok: actualByBudget[name] <= budgets[name],
    }));
  for (const budget of budgetResults) {
    if (!budget.ok) {
      violations.push({
        code: 'BUDGET_EXCEEDED',
        detail: `${budget.name}: ${budget.actual} exceeds ${budget.limit}.`,
      });
    }
  }
  violations.sort((left, right) =>
    `${left.code}:${left.path ?? ''}:${left.detail}`.localeCompare(
      `${right.code}:${right.path ?? ''}:${right.detail}`,
    ),
  );

  return {
    schema: 'pecadosvip.build-artifact-report',
    version: 2,
    policyVersion: 4,
    artifactProfile,
    excludedTopLevelDirectories: uniqueExcludedTopLevelDirectories,
    result: violations.length === 0 ? 'PASS' : 'FAIL',
    budgets: budgetResults,
    files,
    requiredFiles: requiredFileResults,
    summary,
    violations,
  };
}

export function serializeBuildArtifactReport(report: BuildArtifactReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function pathIsInside(parent: string, child: string): boolean {
  const relation = relative(parent, child);
  return relation !== '' && relation !== '..' && !relation.startsWith(`..${sep}`);
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  try {
    const existing = await lstat(path);
    if (existing.isSymbolicLink() || !existing.isFile()) {
      throw new Error('Build report path must be a regular file or absent.');
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
  const profileOption = readCliOption(process.argv.slice(2), '--profile');
  const artifactProfile: BuildArtifactProfile =
    profileOption === undefined || profileOption === 'worker'
      ? 'worker'
      : profileOption === 'standalone'
        ? 'standalone'
        : (() => {
            throw new Error("--profile must be either 'worker' or 'standalone'.");
          })();
  const rootDirectory = resolve(
    readCliOption(process.argv.slice(2), '--root') ??
      resolve(
        repositoryRoot,
        artifactProfile === 'standalone' ? 'dist/standalone' : 'dist',
      ),
  );
  const reportFilename =
    artifactProfile === 'standalone'
      ? 'standalone-artifact-report.json'
      : 'build-artifact-report.json';
  const reportPath = resolve(
    readCliOption(process.argv.slice(2), '--report') ??
      resolve(repositoryRoot, 'output', 'release', reportFilename),
  );
  if (pathIsInside(rootDirectory, reportPath) || rootDirectory === reportPath) {
    throw new Error('Build report must be written outside the artifact root.');
  }
  const actualReportFilename = reportPath.slice(
    Math.max(reportPath.lastIndexOf('/'), reportPath.lastIndexOf('\\')) + 1,
  );
  if (
    actualReportFilename.toLowerCase() !== reportFilename ||
    [
      resolve(repositoryRoot, 'package.json'),
      resolve(repositoryRoot, 'pnpm-lock.yaml'),
      resolve(repositoryRoot, 'LOCAL_TECHNICAL_SCORECARD.json'),
    ].some(
      (protectedPath) =>
        protectedPath.toLowerCase() === reportPath.toLowerCase(),
    )
  ) {
    throw new Error(
      `Build report output must use the dedicated ${reportFilename} filename and cannot alias protected project inputs.`,
    );
  }
  const report = await validateBuildArtifact({
    artifactProfile,
    excludedTopLevelDirectories:
      artifactProfile === 'worker' ? ['standalone'] : [],
    rootDirectory,
  });
  const serialized = serializeBuildArtifactReport(report);
  await writeAtomic(reportPath, serialized);
  const printableReport = relative(repositoryRoot, reportPath).replaceAll('\\', '/');
  process.stdout.write(
    `${JSON.stringify({
      result:
        report.result === 'PASS'
          ? artifactProfile === 'worker'
            ? 'build-artifact-valid'
            : 'standalone-artifact-valid'
          : artifactProfile === 'worker'
            ? 'build-artifact-invalid'
            : 'standalone-artifact-invalid',
      artifactProfile,
      report: printableReport.startsWith('..') ? reportPath : printableReport,
      reportSha256: createHash('sha256').update(serialized).digest('hex'),
      ...report.summary,
      violationCount: report.violations.length,
    })}\n`,
  );
  if (report.result !== 'PASS') {
    process.exitCode = 1;
  }
}

if (isMainModule()) {
  await main().catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        result: 'build-artifact-validation-failed',
        error: error instanceof Error ? error.message : String(error),
      })}\n`,
    );
    process.exitCode = 1;
  });
}
