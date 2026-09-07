import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import { GET } from '../app/favicon.ico/route.ts';

type RawSharpResult = {
  data: Buffer;
  info: { width: number; height: number; channels: number };
};

type RawSharpInstance = {
  raw(): {
    toBuffer(options: { resolveWithObject: true }): Promise<RawSharpResult>;
  };
};

test('favicon fallback returns a local non-script image without a 404', async () => {
  const response = GET();

  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), '/icon.png');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await response.text(), '');
});

test('favicon derivatives have real transparency and the expected dimensions', async () => {
  const root = resolve(import.meta.dirname, '..');
  const derivatives = [
    { path: resolve(root, 'app/icon.png'), size: 256 },
    { path: resolve(root, 'app/apple-icon.png'), size: 180 },
  ];

  for (const derivative of derivatives) {
    const bytes = await readFile(derivative.path);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, 'png');
    assert.equal(metadata.width, derivative.size);
    assert.equal(metadata.height, derivative.size);

    const { data, info } = await (sharp(bytes) as unknown as RawSharpInstance)
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 4);

    let alphaMin = 255;
    let alphaMax = 0;
    for (let index = 3; index < data.length; index += info.channels) {
      alphaMin = Math.min(alphaMin, data[index]);
      alphaMax = Math.max(alphaMax, data[index]);
    }

    assert.equal(alphaMin, 0);
    assert.equal(alphaMax, 255);

    const cornerAlphaIndexes = [
      3,
      (derivative.size - 1) * info.channels + 3,
      (derivative.size - 1) * derivative.size * info.channels + 3,
      (derivative.size * derivative.size - 1) * info.channels + 3,
    ];
    for (const alphaIndex of cornerAlphaIndexes) {
      assert.equal(data[alphaIndex], 0);
    }
  }
});
