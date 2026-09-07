import { createRequire } from 'node:module';
import {
  copyFile,
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { betaRuntimeAssetPaths } from '../lib/beta/beta-media-catalog.ts';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const standaloneRoot = resolve(repositoryRoot, 'dist', 'standalone');
const repositoryRequire = createRequire(resolve(repositoryRoot, 'package.json'));
const buildOnlyRuntimeExclusions = Object.freeze(['image-size']);
const runtimeAssetPaths = betaRuntimeAssetPaths;

type PackageDescriptor = {
  name?: unknown;
};

function pathIsInside(parent: string, child: string): boolean {
  const relation = relative(parent, child);
  return relation !== '' && relation !== '..' && !relation.startsWith(`..${sep}`);
}

async function packageRoot(
  packageName: 'react' | 'react-dom' | 'scheduler',
): Promise<string> {
  const packageJsonPath =
    packageName === 'scheduler'
      ? createRequire(repositoryRequire.resolve('react-dom/package.json')).resolve(
          'scheduler/package.json',
        )
      : repositoryRequire.resolve(`${packageName}/package.json`);
  const root = dirname(packageJsonPath);
  const nodeModulesRoot = resolve(repositoryRoot, 'node_modules');
  if (!pathIsInside(nodeModulesRoot, root)) {
    throw new Error(`${packageName} resolved outside the repository node_modules tree.`);
  }
  const descriptor = JSON.parse(
    await readFile(packageJsonPath, 'utf8'),
  ) as PackageDescriptor;
  if (descriptor.name !== packageName) {
    throw new Error(`Resolved package metadata does not match ${packageName}.`);
  }
  return root;
}

async function copyRuntimePackage(
  packageName: 'react' | 'react-dom' | 'scheduler',
): Promise<void> {
  const source = await packageRoot(packageName);
  const destination = resolve(standaloneRoot, 'node_modules', packageName);
  await rm(destination, { recursive: true, force: true });
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, {
    dereference: true,
    errorOnExist: true,
    recursive: true,
  });
  const copiedPackageJson = resolve(destination, 'package.json');
  const stats = await lstat(copiedPackageJson);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${packageName} was not copied as regular runtime files.`);
  }
}

async function removeSourceMaps(directory: string): Promise<number> {
  let removed = 0;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    const stats = await lstat(path);
    if (stats.isSymbolicLink()) {
      throw new Error(`Standalone dependency contains a symbolic link: ${path}.`);
    }
    if (stats.isDirectory()) {
      removed += await removeSourceMaps(path);
    } else if (stats.isFile() && entry.name.toLocaleLowerCase('en-US').endsWith('.map')) {
      await rm(path, { force: true });
      removed += 1;
    }
  }
  return removed;
}

async function removeBuildOnlyRuntimePackages(): Promise<string[]> {
  const removed: string[] = [];
  for (const packageName of buildOnlyRuntimeExclusions) {
    const destination = resolve(standaloneRoot, 'node_modules', packageName);
    await rm(destination, { recursive: true, force: true });
    removed.push(packageName);
  }
  return removed;
}

async function copyRuntimeAsset(relativePath: string): Promise<void> {
  const pathSegments = relativePath.split('/');
  const source = resolve(repositoryRoot, ...pathSegments);
  const destination = resolve(standaloneRoot, ...pathSegments);
  if (
    !pathIsInside(repositoryRoot, source) ||
    !pathIsInside(standaloneRoot, destination)
  ) {
    throw new Error(`Runtime asset path escapes an approved root: ${relativePath}.`);
  }

  const sourceStats = await lstat(source);
  if (!sourceStats.isFile() || sourceStats.isSymbolicLink()) {
    throw new Error(`Runtime asset is absent or unsafe: ${relativePath}.`);
  }

  await mkdir(dirname(destination), { recursive: true });
  await rm(destination, { force: true });
  await copyFile(source, destination);
  const destinationStats = await lstat(destination);
  if (!destinationStats.isFile() || destinationStats.isSymbolicLink()) {
    throw new Error(`Runtime asset was not copied as a regular file: ${relativePath}.`);
  }
}

async function main(): Promise<void> {
  const serverPath = resolve(standaloneRoot, 'server.js');
  const serverStats = await lstat(serverPath);
  if (!serverStats.isFile() || serverStats.isSymbolicLink()) {
    throw new Error('Vinext standalone server.js is absent or unsafe.');
  }

  for (const packageName of ['react', 'react-dom', 'scheduler'] as const) {
    await copyRuntimePackage(packageName);
  }
  const removedSourceMaps = await removeSourceMaps(
    resolve(standaloneRoot, 'node_modules'),
  );
  const removedBuildOnlyPackages = await removeBuildOnlyRuntimePackages();
  for (const relativePath of runtimeAssetPaths) {
    await copyRuntimeAsset(relativePath);
  }

  process.stdout.write(
    `${JSON.stringify({
      result: 'standalone-runtime-peers-prepared',
      packages: ['react', 'react-dom', 'scheduler'],
      runtimeAssets: runtimeAssetPaths,
      removedBuildOnlyPackages,
      removedSourceMaps,
      root: 'dist/standalone',
    })}\n`,
  );
}

await main().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      result: 'standalone-runtime-peer-preparation-failed',
      error: error instanceof Error ? error.message : String(error),
    })}\n`,
  );
  process.exitCode = 1;
});
