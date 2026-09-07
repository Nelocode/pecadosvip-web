import { getBetaCityMedia } from '../../../../../lib/beta/beta-media-catalog.ts';
import { serveBetaMediaAsset } from '../../../../../lib/beta/beta-media-response.ts';

export async function GET(
  _request: Request,
  context: { params: Promise<{ citySlug: string }> },
) {
  const { citySlug } = await context.params;
  return serveBetaMediaAsset(getBetaCityMedia(citySlug));
}
