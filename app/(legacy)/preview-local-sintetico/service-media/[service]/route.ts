import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { NextResponse } from 'next/server';
import { getSyntheticServiceMedia, isSyntheticServiceMediaKey } from '../../../../../lib/preview/synthetic-service-media';
import {
  buildSyntheticPreviewMediaHeaders,
  getSyntheticPreviewBuildEnvironment,
  isSyntheticPreviewRequestAllowed,
} from '../../../../../lib/preview/synthetic-preview';

export async function GET(request: Request, context: { params: Promise<{ service: string }> }) {
  const environment = getSyntheticPreviewBuildEnvironment(import.meta.env);
  if (!isSyntheticPreviewRequestAllowed(request.headers.get('host'), environment)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const { service } = await context.params;
  if (!isSyntheticServiceMediaKey(service)) return new NextResponse('Not found', { status: 404 });
  const media = getSyntheticServiceMedia(service, 'es');
  try {
    const file = await readFile(resolve(process.cwd(), media.sourcePath));
    return new NextResponse(file, {
      headers: buildSyntheticPreviewMediaHeaders(media.contentType),
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
