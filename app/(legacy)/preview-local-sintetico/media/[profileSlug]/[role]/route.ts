import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { NextResponse } from 'next/server';
import {
  buildSyntheticPreviewMediaHeaders,
  getSyntheticPreviewBuildEnvironment,
  getSyntheticPreviewAsset,
  isSyntheticPreviewRequestAllowed,
} from '../../../../../../lib/preview/synthetic-preview';

export async function GET(request: Request, context: { params: Promise<{ profileSlug: string, role: string }> }) {
  const environment = getSyntheticPreviewBuildEnvironment(import.meta.env);
  if (!isSyntheticPreviewRequestAllowed(request.headers.get('host'), environment)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const { profileSlug, role } = await context.params;
  const media = getSyntheticPreviewAsset(profileSlug, role);
  if (!media) return new NextResponse('Not found', { status: 404 });
  try {
    const file = await readFile(resolve(process.cwd(), media.sourcePath));
    return new NextResponse(file, {
      headers: buildSyntheticPreviewMediaHeaders(media.contentType),
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
