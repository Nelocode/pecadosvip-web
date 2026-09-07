import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { NextResponse } from 'next/server';
import { getSyntheticDecorMedia, isSyntheticDecorMediaKey } from '../../../../../lib/preview/synthetic-decor-media';
import {
  buildSyntheticPreviewMediaHeaders,
  getSyntheticPreviewBuildEnvironment,
  isSyntheticPreviewRequestAllowed,
} from '../../../../../lib/preview/synthetic-preview';

export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  const environment = getSyntheticPreviewBuildEnvironment(import.meta.env);
  if (!isSyntheticPreviewRequestAllowed(request.headers.get('host'), environment)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const { key } = await context.params;
  if (!isSyntheticDecorMediaKey(key)) return new NextResponse('Not found', { status: 404 });
  const media = getSyntheticDecorMedia(key);
  try {
    const file = await readFile(resolve(process.cwd(), media.sourcePath));
    return new NextResponse(file, {
      headers: buildSyntheticPreviewMediaHeaders(media.contentType),
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
