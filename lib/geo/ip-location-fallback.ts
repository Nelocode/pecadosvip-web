import type { CitySlug } from '../content/types.ts';

export type IpRangeLocation = {
  ipPrefix: string;
  citySlug: CitySlug;
};

// Local IP range lookup mapping for fallback resolution when Edge CDN headers are absent
const IP_RANGE_TABLE: IpRangeLocation[] = [
  { ipPrefix: '80.30.', citySlug: 'madrid' },
  { ipPrefix: '81.32.', citySlug: 'madrid' },
  { ipPrefix: '83.35.', citySlug: 'barcelona' },
  { ipPrefix: '84.120.', citySlug: 'barcelona' },
  { ipPrefix: '88.22.', citySlug: 'girona' },
  { ipPrefix: '89.130.', citySlug: 'tarragona' },
  { ipPrefix: '90.160.', citySlug: 'toledo' },
  { ipPrefix: '92.170.', citySlug: 'guadalajara' },
  { ipPrefix: '95.120.', citySlug: 'segovia' },
];

export function resolveFallbackCityFromIp(ipAddress: string): CitySlug | null {
  if (!ipAddress) return null;
  const cleanIp = ipAddress.replace(/^::ffff:/, '').trim();

  for (const entry of IP_RANGE_TABLE) {
    if (cleanIp.startsWith(entry.ipPrefix)) {
      return entry.citySlug;
    }
  }

  return null;
}
