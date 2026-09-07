import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPublicLegalDocument,
  getPublicLegalLinks,
} from '../lib/content/public-legal.ts';
import { getRuntimeContentSnapshot } from '../lib/content/runtime-snapshot.ts';
import { makeSnapshot } from './helpers.ts';

test('legal documents stay unavailable while the aggregate release is blocked', () => {
  assert.equal(
    getPublicLegalDocument(getRuntimeContentSnapshot(), 'privacidad'),
    undefined,
  );
  assert.deepEqual(getPublicLegalLinks(getRuntimeContentSnapshot()), []);
});

test('a complete release exposes direct footer-ready links for every legal document', () => {
  const links = getPublicLegalLinks(makeSnapshot());

  assert.deepEqual(
    links.map((link) => link.href),
    [
      '/legal/aviso-legal',
      '/legal/privacidad',
      '/legal/cookies',
      '/legal/terminos-del-servicio',
    ],
  );
  assert.equal(links.every((link) => link.title.length > 0), true);
});

test('only known approved legal documents are projected after release', () => {
  const snapshot = makeSnapshot();
  const privacy = getPublicLegalDocument(snapshot, 'privacidad');

  assert.equal(privacy?.title, 'Privacy');
  assert.equal(privacy?.body, 'Privacy synthetic test content');
  assert.equal(getPublicLegalDocument(snapshot, 'unknown'), undefined);

  if (privacy) privacy.body = 'outside mutation';
  assert.equal(snapshot.settings.legal.privacy.body, 'Privacy synthetic test content');
});
