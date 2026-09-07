import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { NextResponse } from 'next/server';
import { getSyntheticCityMedia, isSyntheticCityMediaSlug } from '../../../../../lib/preview/synthetic-city-media';
import {
  buildSyntheticPreviewMediaHeaders,
  getSyntheticPreviewBuildEnvironment,
  isSyntheticPreviewRequestAllowed,
} from '../../../../../lib/preview/synthetic-preview';

export async function GET(request: Request, context: { params: Promise<{ citySlug: string }> }) {
  const environment = getSyntheticPreviewBuildEnvironment(import.meta.env);
  if (!isSyntheticPreviewRequestAllowed(request.headers.get('host'), environment)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const { citySlug } = await context.params;
  if (!isSyntheticCityMediaSlug(citySlug)) return new NextResponse('Not found', { status: 404 });
  const media = getSyntheticCityMedia(citySlug, 'es');
  try {
    const file = await readFile(resolve(process.cwd(), media.sourcePath));
    return new NextResponse(file, {
      headers: buildSyntheticPreviewMediaHeaders(media.contentType),
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
