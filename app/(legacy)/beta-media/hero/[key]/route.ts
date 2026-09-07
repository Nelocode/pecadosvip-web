import { getBetaHeroMedia } from '../../../../../lib/beta/beta-media-catalog.ts';
import { serveBetaMediaAsset } from '../../../../../lib/beta/beta-media-response.ts';

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  return serveBetaMediaAsset(getBetaHeroMedia(key));
}
