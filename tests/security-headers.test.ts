import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

import nextConfig, { buildSecurityHeaders } from '../next.config.ts';

function toHeaderMap(headers: ReadonlyArray<{ key: string; value: string }>) {
  return new Map(headers.map(({ key, value }) => [key.toLowerCase(), value]));
}

test('the robots response header follows the fail-closed publication decision', () => {
  assert.equal(
    toHeaderMap(buildSecurityHeaders(false)).get('x-robots-tag'),
    'noindex, nofollow, noarchive',
  );
  assert.equal(toHeaderMap(buildSecurityHeaders(true)).has('x-robots-tag'), false);
});

test('contact form CSP allows only the approved HTTPS origin', () => {
  const approved = toHeaderMap(
    buildSecurityHeaders(false, 'https://contact.example.org/submit'),
  ).get('content-security-policy') ?? '';
  assert.match(
    approved,
    /form-action 'self' https:\/\/contact\.example\.org;/,
  );
  assert.match(approved, /media-src 'self'/);

  const rejected = toHeaderMap(
    buildSecurityHeaders(false, 'javascript:alert(1)'),
  ).get('content-security-policy') ?? '';
  assert.match(rejected, /form-action 'self';/);
  assert.doesNotMatch(rejected, /javascript:/);
});

test('the public runtime config fails closed with defensive response headers', async () => {
  assert.equal(nextConfig.poweredByHeader, false);
  assert.equal(nextConfig.rewrites, undefined);
  assert.equal(typeof nextConfig.headers, 'function');

  const rules = await nextConfig.headers!();
  assert.deepEqual(
    rules.map((rule) => rule.source),
    ['/', '/:path*'],
  );
  const headers = toHeaderMap(rules[0]!.headers);
  assert.deepEqual(rules[1]!.headers, rules[0]!.headers);

  assert.match(headers.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.match(headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.equal(headers.get('referrer-policy'), 'no-referrer');
  assert.equal(headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.match(headers.get('permissions-policy') ?? '', /camera=\(\)/);
  assert.equal(headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  assert.equal(headers.has('strict-transport-security'), false);
});

test('the public artifact excludes the abandoned administrative route families', () => {
  for (const path of [
    'app/admin/page.tsx',
    'app/admin/login/page.tsx',
    'app/admin/auth/login/route.ts',
    'app/admin/auth/logout/route.ts',
    'app/api/admin/page.tsx',
    'app/api/admin/login/page.tsx',
    'app/api/admin/auth/login/route.ts',
    'app/api/admin/auth/logout/route.ts',
    'lib/db/database.ts',
    'lib/security/auth-service.ts',
  ]) {
    assert.equal(existsSync(path), false, `${path} must not ship in the public app`);
  }
});
