import { getBetaServiceMedia } from '../../../../../lib/beta/beta-media-catalog.ts';
import { serveBetaMediaAsset } from '../../../../../lib/beta/beta-media-response.ts';

export async function GET(
  _request: Request,
  context: { params: Promise<{ service: string }> },
) {
  const { service } = await context.params;
  return serveBetaMediaAsset(getBetaServiceMedia(service));
}
