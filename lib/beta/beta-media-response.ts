import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import { NextResponse } from 'next/server.js';

import {
  betaRuntimeAssetPaths,
  type BetaMediaAsset,
} from './beta-media-catalog.ts';

const MAX_BETA_MEDIA_BYTES = 4 * 1024 * 1024;
const approvedAssetPaths = new Set<string>(betaRuntimeAssetPaths);

export function buildBetaMediaHeaders(
  contentType: BetaMediaAsset['contentType'],
  contentLength?: number,
): Record<string, string> {
  return {
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    'Content-Type': contentType,
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, noimageindex',
    ...(contentLength === undefined
      ? {}
      : { 'Content-Length': String(contentLength) }),
  };
}

export function betaMediaNotFound(): NextResponse {
  return new NextResponse('Not found', {
    status: 404,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, noimageindex',
    },
  });
}

function isInside(parent: string, child: string): boolean {
  const relation = relative(parent, child);
  return (
    relation !== '' &&
    relation !== '..' &&
    !relation.startsWith(`..${sep}`) &&
    !isAbsolute(relation)
  );
}

export async function serveBetaMediaAsset(
  asset: BetaMediaAsset | undefined,
): Promise<NextResponse> {
  if (!asset || !approvedAssetPaths.has(asset.sourcePath)) {
    return betaMediaNotFound();
  }

  const repositoryRoot = resolve(process.cwd());
  const assetRoot = resolve(repositoryRoot, 'assets');
  const sourcePath = resolve(repositoryRoot, ...asset.sourcePath.split('/'));
  if (!isInside(assetRoot, sourcePath)) return betaMediaNotFound();

  try {
    const [assetRootRealPath, sourceRealPath, before] = await Promise.all([
      realpath(assetRoot),
      realpath(sourcePath),
      lstat(sourcePath),
    ]);
    if (
      !isInside(assetRootRealPath, sourceRealPath) ||
      sourceRealPath !== sourcePath ||
      !before.isFile() ||
      before.isSymbolicLink() ||
      before.size < 1 ||
      before.size > MAX_BETA_MEDIA_BYTES
    ) {
      return betaMediaNotFound();
    }

    const bytes = await readFile(sourcePath);
    const after = await lstat(sourcePath);
    if (
      after.isSymbolicLink() ||
      !after.isFile() ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      bytes.byteLength !== after.size
    ) {
      return betaMediaNotFound();
    }

    return new NextResponse(bytes, {
      headers: buildBetaMediaHeaders(asset.contentType, bytes.byteLength),
    });
  } catch {
    return betaMediaNotFound();
  }
}
