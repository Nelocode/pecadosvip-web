import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPublicMetadata } from '../lib/seo.ts';
import { resolveSiteConfig } from '../lib/site-config.ts';

test('indexing and structured data are disabled without a confirmed origin', () => {
  const config = resolveSiteConfig({});

  assert.equal(config.origin, undefined);
  assert.equal(config.indexingEnabled, false);
  assert.equal(config.structuredDataEnabled, false);
});

test('unsafe, local and reserved origins are rejected', () => {
  const origins = [
    'http://pecadosvip.com',
    'https://localhost',
    'https://127.0.0.1',
    'https://pecadosvip.invalid',
    'https://pecadosvip.example',
    'https://pecadosvip.test',
    'https://pecadosvip.com/private/path',
    'https://user:password@pecadosvip.com',
  ];

  for (const origin of origins) {
    const config = resolveSiteConfig({
      NEXT_PUBLIC_SITE_URL: origin,
      NEXT_PUBLIC_ALLOW_INDEXING: 'true',
      NEXT_PUBLIC_CONTENT_APPROVED: 'true',
    });

    assert.equal(config.origin, undefined, origin);
    assert.equal(config.indexingEnabled, false, origin);
  }
});

test('both explicit approvals are required before indexing is enabled', () => {
  const originOnly = resolveSiteConfig({
    NEXT_PUBLIC_SITE_URL: 'https://www.pecadosvip.com/',
  });
  const oneApproval = resolveSiteConfig({
    NEXT_PUBLIC_SITE_URL: 'https://www.pecadosvip.com',
    NEXT_PUBLIC_ALLOW_INDEXING: 'true',
  });
  const approved = resolveSiteConfig({
    NEXT_PUBLIC_SITE_URL: 'https://www.pecadosvip.com/',
    NEXT_PUBLIC_ALLOW_INDEXING: 'true',
    NEXT_PUBLIC_CONTENT_APPROVED: 'true',
  });

  assert.equal(originOnly.origin, 'https://www.pecadosvip.com');
  assert.equal(originOnly.indexingEnabled, false);
  assert.equal(oneApproval.indexingEnabled, false);
  assert.equal(approved.indexingEnabled, true);
  assert.equal(approved.structuredDataEnabled, true);
});

test('metadata omits canonical and social URLs when the content route is not publishable', () => {
  const metadata = buildPublicMetadata(
    {
      path: '/perfiles',
      title: 'Perfiles',
      description: 'Perfiles aprobados.',
    },
    {
      origin: 'https://www.pecadosvip.com',
      indexingEnabled: true,
      structuredDataEnabled: true,
    },
    false,
  );

  assert.equal(metadata.alternates, undefined);
  assert.equal(metadata.openGraph && 'url' in metadata.openGraph, false);
  assert.equal(metadata.title, 'Sitio en preparación');
  assert.doesNotMatch(String(metadata.description), /Perfiles aprobados/);
  assert.deepEqual(metadata.robots, { index: false, follow: false });
});

test('metadata emits canonical only when environment and content route gates pass', () => {
  const metadata = buildPublicMetadata(
    {
      path: '/perfiles',
      title: 'Perfiles',
      description: 'Perfiles aprobados.',
    },
    {
      origin: 'https://www.pecadosvip.com',
      indexingEnabled: true,
      structuredDataEnabled: true,
    },
    true,
  );

  assert.deepEqual(metadata.alternates, {
    canonical: 'https://www.pecadosvip.com/perfiles',
  });
  assert.deepEqual(metadata.robots, { index: true, follow: true });
});
