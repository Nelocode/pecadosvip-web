import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const childBootstrap = String.raw`
const { realpathSync } = require('node:fs');
const { createRequire } = require('node:module');
const { dirname, join } = require('node:path');
const { pathToFileURL } = require('node:url');
const requireFromVinext = createRequire(realpathSync('node_modules/vinext/package.json'));
const cjsEntry = requireFromVinext.resolve('image-size');
const packageRoot = dirname(dirname(cjsEntry));
const loadImageSize = () => process.env.IMAGE_SIZE_EXPORT === 'esm'
  ? import(pathToFileURL(join(packageRoot, 'dist/index.mjs')).href)
  : Promise.resolve(requireFromVinext('image-size'));
const put = (buffer, offset, value) => {
  for (let index = 0; index < value.length; index += 1) {
    buffer[offset + index] = value.charCodeAt(index);
  }
};
const u32 = (buffer, offset, value) => {
  buffer[offset] = value >>> 24;
  buffer[offset + 1] = value >>> 16;
  buffer[offset + 2] = value >>> 8;
  buffer[offset + 3] = value;
};
`;

function runIsolatedCase(source: string): void {
  for (const exportMode of ['cjs', 'esm']) {
    const executable = `${childBootstrap}\nloadImageSize().then(({ imageSize }) => {\n${source}\n}).catch((error) => { console.error(error); process.exit(1); });`;
    const result = spawnSync(process.execPath, ['-e', executable], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, IMAGE_SIZE_EXPORT: exportMode },
      // The full suite runs many worker processes in parallel on Windows. Keep
      // this bounded while allowing for scheduler delay before the parser starts.
      timeout: 5_000,
    });

    assert.notEqual(
      (result.error as NodeJS.ErrnoException | undefined)?.code,
      'ETIMEDOUT',
      `${exportMode} parser must never hang`,
    );
    assert.equal(
      result.status,
      0,
      `${exportMode} isolated parser check failed:\n${result.stderr || result.stdout}`,
    );
  }
}

test('patched image-size rejects zero-length ICNS entries without hanging', () => {
  runIsolatedCase(String.raw`
const buffer = new Uint8Array(16);
put(buffer, 0, 'icns');
u32(buffer, 4, 16);
put(buffer, 8, 'ic07');
u32(buffer, 12, 0);
try { imageSize(buffer); process.exit(1); } catch { process.exit(0); }
`);
});

test('patched image-size rejects zero-length JXL and HEIF boxes without hanging', () => {
  runIsolatedCase(String.raw`
const malformed = [];
const jxl = new Uint8Array(40);
u32(jxl, 0, 12); put(jxl, 4, 'JXL ');
u32(jxl, 12, 20); put(jxl, 16, 'ftyp'); put(jxl, 20, 'jxl ');
u32(jxl, 32, 0); put(jxl, 36, 'jxlp');
malformed.push(jxl);
const heif = new Uint8Array(52);
u32(heif, 0, 16); put(heif, 4, 'ftyp'); put(heif, 8, 'heic');
u32(heif, 16, 40); put(heif, 20, 'meta');
u32(heif, 28, 28); put(heif, 32, 'iprp');
u32(heif, 36, 20); put(heif, 40, 'ipco');
u32(heif, 44, 0); put(heif, 48, 'ispe');
malformed.push(heif);
for (const buffer of malformed) {
  let rejected = false;
  try { imageSize(buffer); } catch { rejected = true; }
  if (!rejected) process.exit(1);
}
process.exit(0);
`);
});

test('patched image-size keeps normal PNG parsing operational', () => {
  runIsolatedCase(String.raw`
const png = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z9ZsAAAAASUVORK5CYII=',
  'base64',
));
const dimensions = imageSize(png);
if (dimensions.width !== 1 || dimensions.height !== 1) process.exit(1);
process.exit(0);
`);
});

test('patched image-size preserves valid ICNS and zero-sized ISO box semantics', () => {
  runIsolatedCase(String.raw`
const fixtures = [];
const icns = new Uint8Array(16);
put(icns, 0, 'icns'); u32(icns, 4, 16); put(icns, 8, 'ic07'); u32(icns, 12, 8);
fixtures.push([icns, 128, 128]);
const jxl = new Uint8Array(44);
u32(jxl, 0, 12); put(jxl, 4, 'JXL ');
u32(jxl, 12, 20); put(jxl, 16, 'ftyp'); put(jxl, 20, 'jxl ');
u32(jxl, 32, 0); put(jxl, 36, 'jxlc');
jxl.set([0xff, 0x0a, 0x01, 0x00], 40);
fixtures.push([jxl, 8, 8]);
const heif = new Uint8Array(64);
u32(heif, 0, 16); put(heif, 4, 'ftyp'); put(heif, 8, 'heic');
u32(heif, 16, 40); put(heif, 20, 'meta');
u32(heif, 28, 28); put(heif, 32, 'iprp');
u32(heif, 36, 20); put(heif, 40, 'ipco');
u32(heif, 44, 0); put(heif, 48, 'ispe');
u32(heif, 56, 320); u32(heif, 60, 480);
fixtures.push([heif, 320, 480]);
const jp2 = new Uint8Array(56);
u32(jp2, 0, 12); put(jp2, 4, 'jP  ');
u32(jp2, 12, 20); put(jp2, 16, 'ftyp'); put(jp2, 20, 'jp2 ');
u32(jp2, 32, 24); put(jp2, 36, 'jp2h');
u32(jp2, 40, 0); put(jp2, 44, 'ihdr');
u32(jp2, 48, 480); u32(jp2, 52, 320);
fixtures.push([jp2, 320, 480]);
for (const [buffer, expectedWidth, expectedHeight] of fixtures) {
  const dimensions = imageSize(buffer);
  if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) process.exit(1);
}
process.exit(0);
`);
});

test('dependency policy pins patched framework versions and the local parser patch', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const workspace = readFileSync('pnpm-workspace.yaml', 'utf8');
  const patch = readFileSync('patches/image-size@2.0.2.patch', 'utf8');
  const lockfile = readFileSync('pnpm-lock.yaml', 'utf8');
  const standalonePreparation = readFileSync('scripts/prepare-standalone.ts', 'utf8');
  const vex = readFileSync('SECURITY_ADVISORY_VEX.md', 'utf8');

  assert.equal(packageJson.dependencies.react, '19.2.8');
  assert.equal(packageJson.dependencies['react-dom'], '19.2.8');
  assert.equal(packageJson.devDependencies['react-server-dom-webpack'], '19.2.8');
  assert.equal(packageJson.devDependencies.vite, '8.0.16');
  assert.match(workspace, /image-size@2\.0\.2: patches\/image-size@2\.0\.2\.patch/);
  // pnpm stores the digest of the canonical LF patch. Git may expose CRLF in
  // an existing Windows worktree, so normalize before enforcing the lockfile
  // contract. `.gitattributes` keeps fresh checkouts canonical as well.
  const canonicalPatch = patch.replace(/\r\n/gu, '\n');
  const patchHash = createHash('sha256').update(canonicalPatch).digest('hex');
  const lockHash = lockfile.match(/image-size@2\.0\.2:\s+([a-f0-9]{64})/u)?.[1];
  assert.equal(lockHash, patchHash);
  assert.match(
    lockfile,
    new RegExp(`image-size@2\\.0\\.2\\(patch_hash=${patchHash}\\)`, 'u'),
  );
  assert.match(patch, /normalizedBoxSize = boxSize === 0/);
  assert.match(patch, /Invalid ICNS entry length/);
  assert.match(standalonePreparation, /buildOnlyRuntimeExclusions/);
  assert.match(standalonePreparation, /\['image-size'\]/);
  assert.match(vex, /GHSA-w3rx-r6r6-pgpr/u);
  assert.match(vex, /GHSA-5p2g-fcmc-qvqq/u);
  assert.match(vex, new RegExp(patchHash, 'u'));
  assert.match(vex, /not_affected: component_not_present/u);
  assert.match(vex, /audit como gate fail-closed/u);
});
