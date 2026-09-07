import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { betaRuntimeAssetPaths } from '../lib/beta/beta-media-catalog.ts';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function dockerGlobMatches(path: string, pattern: string): boolean {
  let expression = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]!;
    if (character !== '*') {
      expression += /[\\^$.*+?()[\]{}|]/u.test(character)
        ? `\\${character}`
        : character;
      continue;
    }
    if (pattern[index + 1] !== '*') {
      expression += '[^/]*';
      continue;
    }
    if (pattern[index + 2] === '/') {
      expression += '(?:.*/)?';
      index += 2;
      continue;
    }
    expression += '.*';
    index += 1;
  }
  return new RegExp(`^${expression}$`, 'u').test(path);
}

function isExcludedByDockerignore(path: string, patterns: readonly string[]): boolean {
  let excluded = false;
  for (const rawPattern of patterns) {
    const negated = rawPattern.startsWith('!');
    const pattern = negated ? rawPattern.slice(1) : rawPattern;
    if (dockerGlobMatches(path, pattern)) excluded = !negated;
  }
  return excluded;
}

function betaAssetDockerNegations(): Set<string> {
  const negations = new Set<string>();

  for (const assetPath of betaRuntimeAssetPaths) {
    const segments = assetPath.split('/');
    for (let length = 1; length < segments.length; length += 1) {
      negations.add(`!${segments.slice(0, length).join('/')}`);
    }
    negations.add(`!${assetPath}`);
  }

  return negations;
}

test('Docker runtime pins an exact multi-platform digest, runs release gates and stays non-root', async () => {
  const dockerfile = await readFile(join(repositoryRoot, 'Dockerfile'), 'utf8');
  const stages = [...dockerfile.matchAll(/^FROM\s+(\S+)/gmu)].map(
    (match) => match[1],
  );
  const baseImages = stages.filter((stage) => stage.includes(':'));

  assert.deepEqual(baseImages, [
    'node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df',
    'node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df',
  ]);
  assert.deepEqual(stages.slice(1, 3), ['base', 'dependencies']);
  assert.match(
    dockerfile,
    /^COPY patches\/image-size@2\.0\.2\.patch patches\/image-size@2\.0\.2\.patch$/mu,
  );
  assert.match(dockerfile, /^RUN pnpm install --frozen-lockfile$/mu);
  assert.ok(
    dockerfile.indexOf('COPY patches/image-size@2.0.2.patch') <
      dockerfile.indexOf('RUN pnpm install --frozen-lockfile'),
    'the reproducible dependency patch must be present before install',
  );
  assert.match(dockerfile, /^RUN pnpm run build \\$/mu);
  assert.match(dockerfile, /^    && pnpm run release:artifact:standalone \\$/mu);
  assert.match(dockerfile, /^    && pnpm run smoke:production$/mu);
  assert.match(
    dockerfile,
    /^COPY --from=builder --chown=node:node \/app\/dist\/standalone\/ \.\/$/mu,
  );
  assert.match(dockerfile, /^USER node$/mu);
  assert.match(dockerfile, /^EXPOSE 3000$/mu);
  assert.match(dockerfile, /fetch\('http:\/\/127\.0\.0\.1:'/u);
  assert.match(dockerfile, /^CMD \["node", "server\.js"\]$/mu);
  assert.match(
    dockerfile,
    /^LABEL org\.opencontainers\.image\.revision=\$GIT_SHA$/mu,
  );
  assert.doesNotMatch(dockerfile, /(?:PASSWORD|PRIVATE_KEY|SECRET|TOKEN)=/iu);
});

test('Docker build context uses a reviewed deny-all allowlist', async () => {
  const dockerignore = await readFile(join(repositoryRoot, '.dockerignore'), 'utf8');
  const patterns = dockerignore
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  const allowedNegations = new Set([
    '!Dockerfile',
    '!.dockerignore',
    '!package.json',
    '!pnpm-lock.yaml',
    '!pnpm-workspace.yaml',
    '!patches',
    '!patches/image-size@2.0.2.patch',
    '!tsconfig.json',
    '!next-env.d.ts',
    '!next.config.ts',
    '!vite-env.d.ts',
    '!vite.config.ts',
    '!.openai',
    '!.openai/hosting.json',
    '!app',
    '!app/**',
    '!lib',
    '!lib/**',
    '!public',
    '!public/**',
    '!assets',
    ...betaAssetDockerNegations(),
    '!scripts',
    '!scripts/prepare-standalone.ts',
    '!scripts/production-holding-smoke.ts',
    '!scripts/validate-build-artifact.ts',
    '!scripts/vite-local-synthetic-media.ts',
    '!compliance',
    '!compliance/multilingual',
    '!compliance/multilingual/catalogs',
    '!compliance/multilingual/catalogs/es.json',
    '!compliance/multilingual/catalogs/en.json',
    '!compliance/multilingual/catalogs/fr.json',
    '!compliance/multilingual/catalogs/it.json',
  ]);

  assert.equal(patterns[0], '**');
  assert.deepEqual(
    patterns.filter((pattern) => pattern.startsWith('!')).sort(),
    [...allowedNegations].sort(),
  );
  assert.equal(patterns.includes('!.env'), false);
  assert.equal(patterns.some((pattern) => /evidence|INPUT_MANIFEST/iu.test(pattern)), false);

  const lastNegationIndex = patterns.findLastIndex((pattern) => pattern.startsWith('!'));
  const finalDenials = patterns.slice(lastNegationIndex + 1);
  assert.deepEqual(finalDenials, [
    '**/.env',
    '**/.env.*',
    '**/.netrc',
    '**/.npmrc',
    '**/.ssh',
    '**/.ssh/**',
    '**/credentials.json',
    '**/id_ed25519',
    '**/id_rsa',
    '**/secrets.json',
    '**/service-account*.json',
    '**/service_account*.json',
    '**/*.jks',
    '**/*.key',
    '**/*.keystore',
    '**/*.p12',
    '**/*.pem',
    '**/*.pfx',
  ]);

  const sensitiveFixtures = [
    'app/api/service-account-production.json',
    'lib/keys/private.pem',
    'public/.env.production',
    'public/.ssh/id_ed25519',
    'public/downloads/client.p12',
  ];
  for (const fixture of sensitiveFixtures) {
    assert.equal(
      isExcludedByDockerignore(fixture, patterns),
      true,
      `${fixture} must remain excluded after broad source allowlists.`,
    );
  }

  for (const fixture of [
    'assets/brand/filigree-source-v01.png',
    'assets/brand/filigree-gold-texture-source-v02.png',
    'assets/brand/filigree-gold-texture-source-v03.png',
    'assets/brand/filigree-mosaic-source-v04.png',
    'assets/synthetic-decor/ASSET_MANIFEST.csv',
    'assets/synthetic-decor/selected/border-filigree-v01.webp',
    'assets/synthetic-decor/selected/border-filigree-left-v02.webp',
    'assets/synthetic-decor/selected/border-filigree-right-v02.webp',
    'assets/synthetic-decor/selected/border-filigree-gold-v02.webp',
    'assets/synthetic-decor/selected/border-filigree-left-v03.webp',
    'assets/synthetic-decor/selected/border-filigree-right-v03.webp',
    'assets/synthetic-decor/selected/border-filigree-gold-v03.webp',
    'assets/synthetic-decor/selected/border-filigree-left-v04.webp',
    'assets/synthetic-decor/selected/border-filigree-right-v04.webp',
    'assets/synthetic-hero/ASSET_MANIFEST.csv',
    'assets/synthetic-hero/master/home-hero-editorial-v01.png',
    'assets/synthetic-hero/selected/unreviewed-hero.webp',
  ]) {
    assert.equal(
      isExcludedByDockerignore(fixture, patterns),
      true,
      `${fixture} must remain outside the production build context.`,
    );
  }

  const publicFixtures = [
    'app/[locale]/page.tsx',
    'lib/content/repository.ts',
    'public/images/holding.webp',
    'patches/image-size@2.0.2.patch',
    ...betaRuntimeAssetPaths,
  ];
  for (const fixture of publicFixtures) {
    assert.equal(
      isExcludedByDockerignore(fixture, patterns),
      false,
      `${fixture} must remain available to the builder.`,
    );
  }
});

test('standalone preparation copies exactly the beta media catalog to runtime source paths', async () => {
  const prepareStandalone = await readFile(
    join(repositoryRoot, 'scripts', 'prepare-standalone.ts'),
    'utf8',
  );

  assert.match(
    prepareStandalone,
    /import \{ betaRuntimeAssetPaths \} from '\.\.\/lib\/beta\/beta-media-catalog\.ts';/u,
  );
  assert.match(prepareStandalone, /const runtimeAssetPaths = betaRuntimeAssetPaths;/u);
  assert.match(
    prepareStandalone,
    /const destination = resolve\(standaloneRoot, \.\.\.pathSegments\);/u,
  );
  assert.match(prepareStandalone, /await copyRuntimeAsset\(relativePath\);/u);
});
