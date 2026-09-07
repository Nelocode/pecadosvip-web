import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, lstat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function hasOwnGit(repository) {
  try {
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return resolve(top).toLowerCase() === resolve(repository).toLowerCase();
  } catch { return false; }
}
export async function sourceCommit(repository) {
  if (hasOwnGit(repository)) return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim();
  return JSON.parse(await readFile(resolve(repository, 'wordpress/source-version.json'), 'utf8')).sourceCommit;
}
export async function buildInputs(repository, assetPaths) {
  const paths = new Set(assetPaths);
  async function visit(directory) {
    for (const entry of await readdir(resolve(repository, directory), { withFileTypes: true })) {
      const child = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Unexpected source link: ${child}`);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) paths.add(child);
    }
  }
  for (const directory of ['app', 'lib', 'compliance/multilingual/catalogs', 'wordpress/src', 'wordpress/theme', 'wordpress/plugin']) await visit(directory);
  for (const file of ['build-native.mjs', 'build-inputs.mjs', 'verify-native.mjs', 'package.ps1', 'artifact-info.mjs', 'package.json', 'package-lock.json', 'source-version.json']) paths.add(`wordpress/${file}`);
  const inputs = {};
  for (const path of [...paths].sort()) {
    const full = resolve(repository, path);
    if (relative(repository, full).startsWith(`..${sep}`) || (await lstat(full)).isSymbolicLink()) throw new Error(`Invalid input: ${path}`);
    inputs[path] = digest(await readFile(full));
  }
  return inputs;
}
