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
// Every editable template path used by the theme must exist in all four locales, so a
// partly translated interface cannot ship. Scan the whole theme, not only one file.
const themePhp = ['index.php', 'functions.php', ...(await readdir(resolve(theme, 'inc'))).filter((name) => name.endsWith('.php')).map((name) => `inc/${name}`)];
const literalTextPaths = new Set();
for (const file of themePhp) {
  const source = await readFile(resolve(theme, file), 'utf8');
  for (const match of source.matchAll(/pvwp_(?:text|label|value)\('([^']+)'/g)) {
    if (!match[1].endsWith('.')) literalTextPaths.add(match[1]);
  }
}
for (const locale of Object.keys(seed.copy)) {
  for (const key of literalTextPaths) {
    const value = key.split('.').reduce((object, part) => object?.[part], seed.copy[locale]);
    assert.notEqual(value, undefined, `Missing editable text: ${locale}:${key}`);
  }
}
// Contact channels, legal mechanics and the adult access shell are part of the contract.
const contactKeys = ['eyebrow', 'title', 'lead', 'groupAria', 'disabledTitle', 'disabledBody', 'disabledButton', 'safetyTitle', 'safetyItem1', 'safetyItem2', 'safetyItem3', 'privacyNote', 'responseNote'];
const legalCookieKeys = ['title', 'intro', 'essential', 'none', 'inventoryTitle', 'inventoryPending', 'column1', 'column2', 'column3', 'column4', 'column5', 'analyticsTitle', 'analyticsNone', 'analyticsInfo', 'accept', 'reject', 'configure', 'save', 'revoke', 'revoked', 'reviewNeeded'];
for (const locale of Object.keys(seed.copy)) {
  const contact = seed.copy[locale].contact; const legal = seed.copy[locale].legal;
  assert.ok(contact && legal, `Missing contact/legal copy: ${locale}`);
  for (const key of contactKeys) assert.ok(typeof contact[key] === 'string' && contact[key].length > 0, `Missing contact copy: ${locale}:${key}`);
  for (const channel of ['whatsapp', 'telegram', 'phone', 'email', 'form', 'report']) assert.ok(typeof contact.channels[channel] === 'string' && contact.channels[channel].length > 0, `Missing channel label: ${locale}:${channel}`);
  for (const key of legalCookieKeys) assert.ok(typeof legal.cookies[key] === 'string' && legal.cookies[key].length > 0, `Missing cookie copy: ${locale}:${key}`);
  for (const key of ['essential', 'analytics', 'marketing']) assert.ok(typeof legal.cookies.categories[key] === 'string' && legal.cookies.categories[key].length > 0, `Missing cookie category: ${locale}:${key}`);
  for (const key of ['title', 'shellBody', 'unavailable', 'exit', 'privacy', 'legal']) assert.ok(typeof legal.age[key] === 'string' && legal.age[key].length > 0, `Missing adult access copy: ${locale}:${key}`);
  for (const key of ['title', 'body', 'pending', 'notice']) assert.ok(typeof legal.report[key] === 'string' && legal.report[key].length > 0, `Missing reporting copy: ${locale}:${key}`);
  for (const key of ['name', 'taxId', 'address', 'email', 'tradeName', 'phone', 'registry', 'domainOwner', 'approver']) assert.ok(typeof legal.provider[key] === 'string' && legal.provider[key].length > 0, `Missing provider label: ${locale}:${key}`);
  for (const document of ['aviso-legal', 'privacidad', 'cookies', 'terminos-del-servicio']) {
    assert.ok(typeof legal.documents[document].title === 'string' && legal.documents[document].title.length > 0, `Missing legal title: ${locale}:${document}`);
    assert.ok(typeof legal.documents[document].intro === 'string' && legal.documents[document].intro.length > 0, `Missing legal intro: ${locale}:${document}`);
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
for (const contract of ["includes/legal.php", "includes/contact.php", "'contact'", "'legal'"]) assert.ok(plugin.includes(contract), `Missing plugin wiring: ${contract}`);
const translation = await readFile(resolve(root, 'dist/pecadosvip-content/includes/selective-translation.php'), 'utf8');
for (const contract of ["'content-drafts-v2'", 'function pvc_lt_scoped(', 'function pvc_lt_publishes(', 'function pvc_lt_publish_drafts(', "'pv_profile' => 'Perfil'"]) assert.ok(translation.includes(contract), `Missing translation contract: ${contract}`);
assert.ok(translation.includes("$policy['legacy'] ?? array(), true)"), 'Frozen Legacy inventory must stay excluded');
const contact = await readFile(resolve(root, 'dist/pecadosvip-content/includes/contact.php'), 'utf8');
for (const contract of ['function pvc_contact_normalize(', "array('wa.me', 'api.whatsapp.com')", "array('t.me', 'telegram.me')", 'function pvc_contact_active(', 'function pvc_contact_gate(', "'report'"]) assert.ok(contact.includes(contract), `Missing contact contract: ${contract}`);
assert.ok(contact.includes("'url' => '', 'enabled' => false"), 'Contact destinations must default to empty and disabled');
assert.ok(contact.includes("$channel === 'report'"), 'The reporting channel must bypass the LSSI gate only');
assert.ok(!/'approved'\s*=>\s*true/.test(contact), 'Contact approval must default to disabled');
const legal = await readFile(resolve(root, 'dist/pecadosvip-content/includes/legal.php'), 'utf8');
for (const contract of ['function pvc_legal_missing(', 'function pvc_legal_ready(', 'function pvc_legal_cookie_consent_required(', "'wordpress_test_cookie'"]) assert.ok(legal.includes(contract), `Missing legal contract: ${contract}`);
assert.ok(!/'approved'\s*=>\s*true/.test(legal), 'Legal approval must default to disabled');
const ageAccess = await readFile(resolve(theme, 'inc/age-access.php'), 'utf8');
for (const contract of ['pvwp_age_verified_session', 'pvwp_age_authorized', 'pvwp_age_route_is_open', "header('Referrer-Policy: no-referrer'", 'rest_pre_dispatch']) assert.ok(ageAccess.includes(contract), `Missing access contract: ${contract}`);
for (const forbidden of ['localStorage', 'document.cookie', '$_COOKIE', '_GET[', 'pvn-age-declaration']) assert.ok(!ageAccess.includes(forbidden), `Adult access must not trust a self-declaration: ${forbidden}`);
assert.ok(!/age_gate/.test(await readFile(resolve(theme, 'assets/frontend.js'), 'utf8')), 'Adult access must not be enforced in the browser');
const themeCompliance = await readFile(resolve(theme, 'inc/contact-legal.php'), 'utf8');
assert.ok(themeCompliance.includes("if ($missing && current_user_can('edit_posts'))"), 'The pending provider checklist must stay editor-only');
assert.ok(themeCompliance.includes('if ($onlyWhenActive && !$report) { return; }'), 'The public footer must not announce a pending reporting channel');
// A profile published only in Spanish must stay visible and reachable in the other
// languages, disclosed as untranslated, while the public catalog keeps strict semantics.
const localizedRecords = await readFile(resolve(root, 'dist/pecadosvip-content/includes/localized-records.php'), 'utf8');
for (const contract of ['const PVC_SOURCE_LOCALE', 'function pvc_records_localized(', 'function pvc_record_localized(', 'function pvc_records_fallback_count(']) assert.ok(localizedRecords.includes(contract), `Missing locale completion contract: ${contract}`);
assert.ok(localizedRecords.includes("$record['fallback'] = true;"), 'A completed record must be flagged as untranslated');
const themeFunctions = await readFile(resolve(theme, 'functions.php'), 'utf8');
assert.ok(themeFunctions.includes('pvc_records_localized($type, $locale)'), 'Profile routes must use the fallback-aware list');
const themeRender = await readFile(resolve(theme, 'inc/render.php'), 'utf8');
assert.ok(themeRender.includes("pvc_records_localized('profile', $locale)"), 'The profile listing must use the fallback-aware list');
assert.ok(themeRender.includes('pvc_record_localized($kind, $locale'), 'The language selector must follow the same fallback');
assert.ok(themeRender.includes('function pvwp_fallback_copy()'), 'The untranslated disclosure must exist');
for (const locale of ['es', 'en', 'fr', 'it']) assert.ok(themeRender.includes(`'${locale}' => array('card' =>`), `Missing untranslated disclosure copy: ${locale}`);
assert.ok(plugin.includes("pvc_records('profile', $locale)"), 'The public catalog must stay strictly per-locale');
// Automatic translation of a newly published model.
const autoTranslation = await readFile(resolve(root, 'dist/pecadosvip-content/includes/auto-translation.php'), 'utf8');
for (const contract of ['function pvc_lt_auto_available(', 'function pvc_lt_auto_translate(', "add_action('transition_post_status'", "'_pvc_lt_source'", "['_pvc_lt_engine'] = 'auto'"]) assert.ok(autoTranslation.includes(contract), `Missing automatic translation contract: ${contract}`);
assert.ok(autoTranslation.includes("if (!pvc_lt_auto_available()) { return; }"), 'The automatic path must stay inert without a translation source');
assert.ok(autoTranslation.includes("if (!$changed) {"), 'An unchanged engine output must never be stored as a translation');
assert.ok(autoTranslation.includes("if (get_post_meta($post->ID, '_pvc_lt_source', true)) { return; }"), 'A generated translation must never trigger another run');
assert.ok(plugin.includes('includes/auto-translation.php'), 'The plugin must load the automatic translation module');
const translationUi = await readFile(resolve(root, 'dist/pecadosvip-content/assets/local-translation.js'), 'utf8');
assert.ok(translationUi.includes('pvc-lt-auto'), 'The translation screen must offer the automatic mode');
assert.ok(translationUi.includes('function schedulePoll()'), 'The automatic mode must poll instead of running unconditionally');
assert.ok(translationUi.includes('function startHandsFree()'), 'The automatic mode must try to prepare the translator without a click');
// Offline engine: no API, no key, no network.
const offlineEngine = await readFile(resolve(root, 'dist/pecadosvip-content/includes/offline-translation.php'), 'utf8');
for (const contract of ['function pvc_lt_offline_dictionary(', 'function pvc_lt_offline_translate(', 'function pvc_lt_offline_case(', 'function pvc_lt_offline_key(']) assert.ok(offlineEngine.includes(contract), `Missing offline engine contract: ${contract}`);
assert.ok(offlineEngine.includes('pvc_lt_offline_key((string) $source)'), 'Dictionary keys must be normalised exactly like lookups');
assert.ok(offlineEngine.includes('(float) ($known / $words)'), 'Coverage must be reported as a float');
assert.ok(!/wp_remote_|curl_|file_get_contents\(['"]https?:/i.test(offlineEngine), 'The offline engine must never reach the network');
assert.ok(autoTranslation.includes('pvc_lt_offline_translate($text, $to)'), 'The automatic path must fall back to the offline glossary');
assert.ok(autoTranslation.includes('$locale_publish = $publish && $complete;'), 'A partial translation must never be published');
assert.ok(plugin.includes('includes/offline-translation.php'), 'The plugin must load the offline engine');
assert.ok(themeCompliance.includes("pvwp_legal_report('contact')"), 'The reporting channel must stay on the contact page');
/**
 * Structural check for the PHP sources. This is NOT a PHP parser or a substitute for
 * `php -l`: it only verifies that braces, parentheses and brackets balance inside the
 * `<?php` blocks, after comments and string literals are removed. It catches gross
 * syntax damage; it cannot prove that the PHP is valid.
 */
function phpCode(source) {
  const blocks = []; let index = 0;
  while (true) {
    const start = source.indexOf('<?php', index);
    if (start === -1) break;
    let end = source.indexOf('?>', start);
    if (end === -1) end = source.length;
    blocks.push(source.slice(start + 5, end));
    index = end + 2;
  }
  return blocks.join('\n');
}
function phpDelimitersBalanced(source) {
  const code = phpCode(source); let out = ''; let i = 0;
  while (i < code.length) {
    const pair = code.slice(i, i + 2);
    if (pair === '/*') { const end = code.indexOf('*/', i + 2); i = end === -1 ? code.length : end + 2; continue; }
    if (pair === '//') { const end = code.indexOf('\n', i); i = end === -1 ? code.length : end; continue; }
    if (code[i] === "'" || code[i] === '"') {
      const quote = code[i]; i++;
      while (i < code.length) { if (code[i] === '\\') { i += 2; continue; } if (code[i] === quote) { i++; break; } i++; }
      continue;
    }
    out += code[i]; i++;
  }
  const closing = { '{': '}', '(': ')', '[': ']' }; const stack = [];
  for (const character of out) {
    if (closing[character]) { stack.push(closing[character]); continue; }
    if (character === '}' || character === ')' || character === ']') { if (stack.pop() !== character) return false; }
  }
  return stack.length === 0;
}
const phpSources = [
  ...(await readdir(resolve(theme, 'inc'))).filter((name) => name.endsWith('.php')).map((name) => [theme, `inc/${name}`]),
  [root, 'theme/pecadosvip/functions.php'], [root, 'theme/pecadosvip/index.php'],
  ...(await readdir(resolve(root, 'plugin/pecadosvip-content/includes'))).map((name) => [root, `plugin/pecadosvip-content/includes/${name}`]),
  [root, 'plugin/pecadosvip-content/pecadosvip-content.php'],
  ...(await readdir(resolve(root, 'tests'))).filter((name) => name.endsWith('.php')).map((name) => [root, `tests/${name}`]),
  ...(await readdir(resolve(root, 'tools'))).filter((name) => name.endsWith('.php')).map((name) => [root, `tools/${name}`]),
];
for (const [base, relative] of phpSources) {
  const source = await readFile(resolve(base, relative), 'utf8');
  assert.ok(phpDelimitersBalanced(source), `Unbalanced PHP delimiters in ${relative}`);
}
// Every path a QA test includes must be mounted into the QA container. A test that
// includes an unmounted directory passes locally and fails in Docker.
const composeSource = await readFile(resolve(root, 'docker-compose.yml'), 'utf8');
const mountedDirectories = new Set([...composeSource.matchAll(/^\s*-\s*\.\/([A-Za-z0-9_-]+):\//gm)].map((match) => match[1]));
assert.ok(mountedDirectories.has('tests'), 'The QA container must mount the test directory');
for (const name of (await readdir(resolve(root, 'tests'))).filter((entry) => entry.endsWith('.php'))) {
  const source = await readFile(resolve(root, 'tests', name), 'utf8');
  for (const match of source.matchAll(/__DIR__\s*\.\s*'\/\.\.\/([A-Za-z0-9_-]+)\//g)) {
    assert.ok(mountedDirectories.has(match[1]), `tests/${name} includes ../${match[1]}/, which the QA container does not mount`);
  }
}
// The WordPress runtime and its focused CI workflow belong to this delivery.
// Keep unrelated application/backend source outside the allowed change surface.
const coreDiff = hasOwnGit(repository) ? execFileSync('git', ['diff', '--name-only', 'HEAD', '--', '.', ':(exclude)wordpress', ':(exclude)Dockerfile', ':(exclude).dockerignore', ':(exclude).github/workflows/watermark-qa.yml', ':(exclude)tsconfig.json', ':(exclude)eslint.config.mjs'], { cwd: repository, encoding: 'utf8' }).trim() : '';
assert.equal(coreDiff, '', 'Unrelated application/backend files were modified');
const tsconfig = await json(resolve(repository, 'tsconfig.json'));
assert.ok(tsconfig.exclude.includes('wordpress'));
assert.ok((await readFile(resolve(repository, 'eslint.config.mjs'), 'utf8')).includes("'wordpress/**'"));
console.log(JSON.stringify({ result: 'PASS_STATIC', mode: manifest.mode, seedRecords: seed.records.length, locales: manifest.locales, mediaAssets: assets.length, referencedMedia: references.size, editableTemplatePaths: literalTextPaths.size,
  checks: ['unique localized records', 'adult synthetic initial profiles', 'media bytes and SHA-256', 'current build inputs', 'source and package parity', 'JS syntax', 'no snapshot/hydration output', 'editorial plugin contracts', 'editable text parity in es/en/fr/it', 'contact, legal and adult-access contracts', 'PHP delimiter balance (not a PHP lint)', 'original application/backend unchanged'],
  runtimeWordPress: 'NOT_VERIFIED_BY_THIS_SCRIPT: run Docker QA including save-refresh test; static checks do not prove runtime editability' }, null, 2));
