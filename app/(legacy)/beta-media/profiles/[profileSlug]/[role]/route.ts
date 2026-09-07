import { getBetaProfileMedia } from '../../../../../../lib/beta/beta-media-catalog.ts';
import { serveBetaMediaAsset } from '../../../../../../lib/beta/beta-media-response.ts';

export async function GET(
  _request: Request,
  context: { params: Promise<{ profileSlug: string; role: string }> },
) {
  const { profileSlug, role } = await context.params;
  return serveBetaMediaAsset(getBetaProfileMedia(profileSlug, role));
}
