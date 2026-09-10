// Offline source inspection for the Dockerfile at the audited revision.
// This is not a Docker parser, an esbuild replacement, or an image build.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const tracked = new Set(git('ls-files', '-z').split('\0').filter(Boolean));
const required = new Set();
const problems = [];
const warnings = [];
const dockerfile = read('Dockerfile');
const build = read('wordpress/build-native.mjs');
const inventory = read('wordpress/build-inputs.mjs');
const rules = read('.dockerignore').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).map((line) => {
  const include = line.startsWith('!');
  const pattern = (include ? line.slice(1) : line).replace(/^\/+|\/+$/g, '');
  // Deliberately fail on syntax not present in this repository's audited rules.
  assert.ok(!/[?\[\]\\]/.test(pattern), `Unsupported Docker ignore pattern: ${pattern}`);
  let expression = '';
  for (let i = 0; i < pattern.length; i++) {
    if (pattern.slice(i, i + 3) === '**/') { expression += '(?:.*/)?'; i += 2; }
    else if (pattern.slice(i, i + 2) === '**') { expression += '.*'; i++; }
    else if (pattern[i] === '*') expression += '[^/]*';
    else expression += pattern[i].replace(/[.+^${}()|]/g, '\\$&');
  }
  return { include, regex: new RegExp(`^${expression}$`) };
});
function included(path) {
  const segments = path.split('/');
  const candidates = segments.map((_, i) => segments.slice(0, i + 1).join('/'));
  let result = true;
  for (const rule of rules) if (candidates.some((part) => rule.regex.test(part))) result = rule.include;
  return result;
}
// Boundary examples protect this limited matcher from silently changing meaning.
for (const path of ['wordpress/src/seed.ts', 'wordpress/package-lock.json', 'app/theme.css']) assert.ok(included(path));
for (const path of ['.git/config', 'wordpress/dist/old.php', 'wordpress/node_modules/esbuild/bin/esbuild', 'app/.env', 'app/nested/key.pem']) assert.ok(!included(path));

function need(path) {
  assert.ok(path && !path.startsWith('/') && !path.split('/').includes('..'), `Non-local input: ${path}`);
  required.add(path);
}
function walk(path) {
  for (const entry of readdirSync(resolve(root, path), { withFileTypes: true })) {
    const next = `${path}/${entry.name}`;
    if (entry.isSymbolicLink()) problems.push(`Source symlink: ${next}`);
    else if (entry.isDirectory()) walk(next);
    else if (entry.isFile()) need(next);
  }
}
// Inventory reads are real build prerequisites, including files not bundled by esbuild.
const roots = inventory.match(/for \(const directory of \[([^\]]+)\]\) await visit\(directory\)/);
const files = inventory.match(/for \(const file of \[([^\]]+)\]\) paths\.add/);
assert.ok(roots && files, 'Review changed build-inputs.mjs enumeration before reusing this audit');
const literals = (text) => [...text.matchAll(/'([^']+)'/g)].map((match) => match[1]);
for (const path of literals(roots[1])) walk(path);
for (const path of literals(files[1])) need(`wordpress/${path}`);
for (const path of ['Dockerfile', '.dockerignore', 'wordpress/docker-compose.yml']) need(path);

// Check local COPY instructions; generated cross-stage COPY sources are verified below.
const directCopies = [];
for (const line of dockerfile.split(/\r?\n/).filter((line) => /^COPY\s/.test(line))) {
  if (line === 'COPY . .') continue;
  if (line.startsWith('COPY --from=builder ')) continue;
  assert.match(line, /^COPY [^\s*]+ [^\s]+$/, 'Review new COPY syntax');
  const path = line.split(/\s+/)[1];
  directCopies.push(path);
  need(path);
}
for (const name of ['pecadosvip', 'pecadosvip-content']) {
  assert.ok(dockerfile.includes(`COPY --from=builder /app/wordpress/dist/${name} `));
  assert.ok(build.includes(`'${name}'`));
}
assert.ok(build.includes("resolve(root,'dist',name)"));
assert.ok(build.includes("await rename(resolve(stage,name),target)"));
assert.ok(dockerfile.includes('RUN cd wordpress && npm install'));
assert.ok(dockerfile.includes('RUN cd wordpress && npm run build'));
const packageJson = JSON.parse(read('wordpress/package.json'));
const lock = JSON.parse(read('wordpress/package-lock.json'));
assert.equal(packageJson.scripts.build, 'node build-native.mjs');
assert.deepEqual(lock.packages[''].devDependencies, packageJson.devDependencies);
assert.equal(lock.packages['node_modules/esbuild'].version, packageJson.devDependencies.esbuild);
assert.equal(lock.lockfileVersion, 3);
const tsconfig = JSON.parse(read('tsconfig.json'));
assert.equal(tsconfig.extends, undefined, 'Review newly inherited TypeScript configuration');
need('tsconfig.json');

// Follow static runtime imports; type-only imports do not require runtime packages.
const modules = new Set();
const externalImports = new Set();
function visitModule(path) {
  if (modules.has(path)) return;
  modules.add(path); need(path);
  if (path.endsWith('.json')) return;
  const source = read(path);
  assert.ok(!/\brequire\s*\(|\bimport\s*\(/.test(source) || path === 'wordpress/build-native.mjs', `Review dynamic module load: ${path}`);
  const imports = [...source.matchAll(/^\s*import\s+(type\s+)?[\s\S]*?\s+from\s*['"]([^'"]+)['"]/gm)]
    .filter((match) => !match[1]).map((match) => match[2]);
  imports.push(...[...source.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)].map((match) => match[1]));
  imports.push(...[...source.matchAll(/^\s*export\s+(type\s+)?(?:\*|\{[^}]*\})\s+from\s*['"]([^'"]+)['"]/gm)]
    .filter((match) => !match[1]).map((match) => match[2]));
  for (const specifier of imports) {
    if (!specifier.startsWith('.')) { externalImports.add(specifier); continue; }
    const candidate = posix.normalize(posix.join(posix.dirname(path), specifier));
    const resolved = [candidate, ...['.ts', '.tsx', '.mts', '.js', '.mjs', '.json', '/index.ts'].map((suffix) => candidate + suffix)]
      .find((file) => existsSync(resolve(root, file)) && lstatSync(resolve(root, file)).isFile());
    assert.ok(resolved, `Missing imported module in ${path}: ${specifier}`);
    visitModule(resolved);
  }
}
for (const path of ['wordpress/src/seed.ts', 'wordpress/build-native.mjs']) visitModule(path);
for (const name of externalImports) assert.ok(name.startsWith('node:') || packageJson.devDependencies[name], `Uninstalled runtime build import: ${name}`);

// Enumerate file names from the current closed catalogs without executing their code.
const assets = new Set(['app/icon.png', 'app/apple-icon.png']);
for (const [kind, directory] of [['city', 'cities'], ['decor', 'decor'], ['hero', 'hero'], ['service', 'services']]) {
  const source = read(`lib/preview/synthetic-${kind}-media.ts`);
  assert.ok(source.includes('sourcePath: `assets/synthetic-' + directory + '/selected/${definition.filename}`'));
  const names = [...source.matchAll(/filename:\s*'([^']+)'/g)].map((match) => match[1]);
  assert.ok(names.length > 0);
  for (const name of names) assets.add(`assets/synthetic-${directory}/selected/${name}`);
}
const profiles = read('lib/preview/synthetic-preview.ts');
assert.ok(profiles.includes('sourcePath: `assets/synthetic-profiles/${slug}/${'));
assert.ok(profiles.includes("role === 'cover' ? 'cover' : 'gallery'"));
const slugs = [...profiles.matchAll(/slug:\s*'([^']+)'/g)].map((match) => match[1]);
for (const slug of slugs) {
  const names = [...profiles.matchAll(/'(?:[^']+\.png)'/g)].map((match) => match[0].slice(1, -1)).filter((name) => name.startsWith(`${slug}-`));
  assert.equal(names.length, 4, `Review profile media definition: ${slug}`);
  for (const name of names) assets.add(`assets/synthetic-profiles/${slug}/${name.includes('-cover-') ? 'cover' : 'gallery'}/${name}`);
}
assert.ok(slugs.length > 0);
for (const path of assets) need(path);

const styles = new Set();
const cssUrls = new Set();
function visitCss(path) {
  if (styles.has(path)) return;
  styles.add(path); need(path);
  const source = read(path);
  for (const match of source.matchAll(/@import\s+['"]([^'"]+)['"];?/g)) visitCss(posix.normalize(posix.join(posix.dirname(path), match[1])));
  for (const match of source.matchAll(/url\((['"]?)(\/[^)'"\s]+)\1\)/g)) cssUrls.add(match[2]);
}
for (const file of ['globals.css', 'theme.css', 'public-site.css']) visitCss(`app/${file}`);
assert.deepEqual([...cssUrls], ['/preview-local-sintetico/decor-media/border-filigree'], 'Review new CSS media URLs against the seed catalog');
assert.ok(build.includes("media['/preview-local-sintetico/decor-media/border-filigree']=media['/beta-media/decor/border-filigree']"));

for (const path of [...required].sort()) {
  if (!tracked.has(path)) problems.push(`Build reads untracked input: ${path}`);
  if (!existsSync(resolve(root, path))) problems.push(`Missing input: ${path}`);
  else if (lstatSync(resolve(root, path)).isSymbolicLink()) problems.push(`Input symlink: ${path}`);
  if (!included(path)) problems.push(`Input excluded from Docker context: ${path}`);
}
const untracked = git('ls-files', '--others', '-z').split('\0').filter(Boolean);
const localOnlyIncluded = untracked.filter((path) => included(path));
const provenance = JSON.parse(read('wordpress/source-version.json'));
const head = git('rev-parse', 'HEAD');
if (!included('.git/HEAD') && provenance.sourceCommit !== head) warnings.push('Docker fallback source-version.json does not identify current HEAD.');
if (included('wordpress/.build/example-local-file')) warnings.push('wordpress/.build is allowed: local staging can enter a local Docker context.');
console.log(JSON.stringify({
  mode: 'static-source-inspection-no-docker-no-network', head,
  trackedContextFiles: [...tracked].filter(included).length,
  requiredFiles: required.size, transitiveModules: modules.size, catalogAndIconFiles: assets.size,
  cssFiles: styles.size, directRuntimeCopies: directCopies.length,
  nonBuiltinBuildImports: [...externalImports].filter((name) => !name.startsWith('node:')).sort(),
  packageLockMatches: true,
  missingExcludedOrUntrackedInputs: problems,
  localOnlyIncludedCount: localOnlyIncluded.length,
  localOnlyIncludedBuildStagingCount: localOnlyIncluded.filter((path) => path.startsWith('wordpress/.build/')).length,
  fallbackSourceCommit: provenance.sourceCommit,
  warnings,
}, null, 2));
if (problems.length) process.exitCode = 1;
