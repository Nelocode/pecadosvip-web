import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { buildInputs, hasOwnGit } from './build-inputs.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '..');
const theme = resolve(root, 'dist/pecadosvip');
const sha = (value) => createHash('sha256').update(value).digest('hex');
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const manifest = await json(resolve(theme, 'content/manifest.json'));
const seedBytes = await readFile(resolve(theme, 'content/seed.json'));
const seed = JSON.parse(seedBytes);
assert.equal(manifest.schema, 2);
assert.equal(manifest.mode, 'native-editable-wordpress');
assert.equal(manifest.productionActivation, false);
assert.equal(seed.productionActivation, false);
assert.equal(seed.version, 1);
assert.equal(sha(seedBytes), manifest.seedSha256);
assert.equal(seed.sourceCommit, manifest.sourceCommit);
assert.equal(seed.records.length, manifest.records);
assert.equal(seed.records.length, 224, 'Unexpected initial editorial inventory');
assert.deepEqual(Object.keys(seed.copy).sort(), ['en', 'es', 'fr', 'it']);
const assets = await json(resolve(theme, 'content/media-inventory.json'));
assert.equal(assets.length, manifest.mediaCount);
const assetPaths = new Set(assets.map((asset) => asset.path));
const references = new Set();
function media(asset) {
  if (!asset) return;
  assert.match(asset.path, /^assets\/media\/[a-f0-9]{24}\.(png|jpe?g|webp)$/i);
  assert.ok(assetPaths.has(asset.path), `Unmapped seed image: ${asset.path}`);
  assert.equal(typeof asset.alt, 'string');
  references.add(asset.path);
}
const identities = new Set();
const counts = {};
for (const record of seed.records) {
  const identity = [record.type, record.locale, record.key].join(':');
  assert.ok(!identities.has(identity), `Duplicate initial content: ${identity}`);
  identities.add(identity);
  assert.ok(['profile', 'service', 'city', 'page'].includes(record.type));
  assert.ok(seed.copy[record.locale]);
  assert.match(record.key, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(record.title && !record.title.includes('undefined'), identity);
  assert.equal(typeof record.content, 'string');
  assert.equal(typeof record.excerpt, 'string');
  assert.ok(!/<script\b|<iframe\b|(?:href|src)=["'](?:javascript:|https?:\/\/localhost)/i.test(record.content));
  media(record.image);
  for (const image of record.data.gallery || []) media(image);
  if (record.type === 'profile') {
    assert.ok(record.data.age >= 18 && record.data.age <= 100);
    assert.equal(record.data.synthetic, true);
    assert.ok(['madrid', 'barcelona'].includes(record.data.homeZone));
    assert.ok(record.data.gallery.length >= 4);
  }
  if (record.type === 'city') assert.ok(['madrid', 'barcelona'].includes(record.data.zone));
  const counter = `${record.locale}:${record.type}`;
  counts[counter] = (counts[counter] || 0) + 1;
}
for (const locale of Object.keys(seed.copy)) {
  for (const legacy of ['profiles', 'catalog', 'metadata', 'cities', 'homeServices', 'locale']) assert.ok(!(legacy in seed.copy[locale]), `Duplicate legacy content: ${locale}:${legacy}`);
  for (const [type, count] of Object.entries({ profile: 6, service: 34, city: 8, page: 8 })) assert.equal(counts[`${locale}:${type}`], count);
  for (const key of ['logo', 'icon', 'hero', 'mosaic']) media(seed.copy[locale].site[key]);
  assert.ok(seed.copy[locale].nativeUi.previous && seed.copy[locale].nativeUi.close);
}
assert.deepEqual((await readdir(resolve(theme, 'assets/media'))).sort(), [...assetPaths].map((path) => path.split('/').pop()).sort());
for (const asset of assets) {
  const bytes = await readFile(resolve(theme, asset.path));
  assert.equal(bytes.length, asset.bytes);
  assert.equal(sha(bytes), asset.sha256);
}
const savedInputs = await json(resolve(theme, 'content/build-inputs.json'));
assert.deepEqual(await buildInputs(repository, assets.map((asset) => asset.sourcePath)), savedInputs, 'Source changed since build: run npm run build again.');
async function verifyCopy(source, destination) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    assert.ok(!entry.isSymbolicLink());
    if (entry.isDirectory()) await verifyCopy(resolve(source, entry.name), resolve(destination, entry.name));
    else {
      const bytes = await readFile(resolve(source, entry.name));
      assert.equal(sha(bytes), sha(await readFile(resolve(destination, entry.name))), `Outdated package: ${entry.name}`);
      if (entry.name.endsWith('.js')) new Script(bytes.toString(), { filename: entry.name });
    }
  }
}
await verifyCopy(resolve(root, 'theme/pecadosvip'), theme);
await verifyCopy(resolve(root, 'plugin/pecadosvip-content'), resolve(root, 'dist/pecadosvip-content'));
const render = await readFile(resolve(theme, 'inc/render.php'), 'utf8');
const literalTextPaths = [...new Set([...render.matchAll(/pvwp_(?:text|label|value)\('([^']+)'/g)].map((match) => match[1]).filter((key) => !key.endsWith('.')))];
for (const locale of Object.keys(seed.copy)) {
  for (const key of literalTextPaths) {
    const value = key.split('.').reduce((object, part) => object?.[part], seed.copy[locale]);
    assert.notEqual(value, undefined, `Missing editable text: ${locale}:${key}`);
  }
}
const contentFiles = await readdir(resolve(theme, 'content'));
assert.ok(!contentFiles.includes('pages') && !contentFiles.includes('routes.json'), 'Snapshot frontend must not be shipped');
const css = await readFile(resolve(theme, 'assets/frontend.css'), 'utf8');
assert.ok(!css.includes('/preview-local-sintetico/') && !css.includes('@import '));
for (const match of css.matchAll(/url\('\.\/([^']+)'\)/g)) await readFile(resolve(theme, 'assets', match[1]));
const script = await readFile(resolve(theme, 'assets/frontend.js'), 'utf8');
new Script(script);
assert.ok(!/hydrateRoot|react-dom|process\.env\.|localhost:/.test(script));
const plugin = await readFile(resolve(root, 'dist/pecadosvip-content/pecadosvip-content.php'), 'utf8');
for (const contract of ['function pvc_records(', 'function pvc_record(', 'function pvc_copy(', 'function pvc_site(', "'custom-fields'", "'has_password' => false", "'post_status' => 'publish'"]) assert.ok(plugin.includes(contract), `Missing editable contract: ${contract}`);
const coreDiff = hasOwnGit(repository) ? execFileSync('git', ['diff', '--name-only', 'HEAD', '--', '.', ':(exclude)wordpress', ':(exclude)tsconfig.json', ':(exclude)eslint.config.mjs'], { cwd: repository, encoding: 'utf8' }).trim() : '';
assert.equal(coreDiff, '', 'Existing application/backend files were modified');
const tsconfig = await json(resolve(repository, 'tsconfig.json'));
assert.ok(tsconfig.exclude.includes('wordpress'));
assert.ok((await readFile(resolve(repository, 'eslint.config.mjs'), 'utf8')).includes("'wordpress/**'"));
console.log(JSON.stringify({ result: 'PASS_STATIC', mode: manifest.mode, seedRecords: seed.records.length, locales: manifest.locales, mediaAssets: assets.length, referencedMedia: references.size, editableTemplatePaths: literalTextPaths.length,
  checks: ['unique localized records', 'adult synthetic initial profiles', 'media bytes and SHA-256', 'current build inputs', 'source and package parity', 'JS syntax', 'no snapshot/hydration output', 'editorial plugin contracts', 'original application/backend unchanged'],
  runtimeWordPress: 'NOT_VERIFIED_BY_THIS_SCRIPT: run Docker QA including save-refresh test; static checks do not prove runtime editability' }, null, 2));
