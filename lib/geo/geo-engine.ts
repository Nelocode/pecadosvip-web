import type { CitySlug, Profile } from '../content/types.ts';

export type GeoCoordinates = {
  latitude: number;
  longitude: number;
};

export const CITY_COORDINATES: Record<CitySlug, GeoCoordinates> = {
  madrid: { latitude: 40.4168, longitude: -3.7038 },
  barcelona: { latitude: 41.3879, longitude: 2.1699 },
  girona: { latitude: 41.9794, longitude: 2.8214 },
  tarragona: { latitude: 41.1189, longitude: 1.2445 },
  toledo: { latitude: 39.8628, longitude: -4.0273 },
  guadalajara: { latitude: 40.6327, longitude: -3.1609 },
  segovia: { latitude: 40.9429, longitude: -4.1088 },
};

export type MatchPriority = 'priority_1_exact' | 'priority_2_tour' | 'priority_3_metropolitan' | 'none';

export type PrioritizedProfile = {
  profile: Profile;
  priority: MatchPriority;
  activeTourCity?: CitySlug;
  estimatedDistanceKm?: number;
  badgeLabel?: string;
};

/**
 * Calculates Haversine distance in kilometers between two geographical coordinates.
 */
export function calculateHaversineDistance(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Rounded to 1 decimal place
}

/**
 * Resolves visitor city from HTTP headers (Edge/Cloudflare/Vercel) or fallback.
 */
export function resolveVisitorCityFromHeaders(headers: Record<string, string | undefined>): CitySlug | null {
  const rawCity =
    headers['cf-ipcity'] ||
    headers['x-vercel-ip-city'] ||
    headers['x-geo-city'] ||
    headers['x-user-city'];

  if (!rawCity) return null;

  const normalized = rawCity.trim().toLowerCase();

  const cityMap: Record<string, CitySlug> = {
    madrid: 'madrid',
    barcelona: 'barcelona',
    girona: 'girona',
    gerona: 'girona',
    tarragona: 'tarragona',
    toledo: 'toledo',
    guadalajara: 'guadalajara',
    segovia: 'segovia',
  };

  return cityMap[normalized] || null;
}

/**
 * Ranks profiles based on 3-tier GEO Engine priority rules:
 * Priority 1: Exact Match (Primary city)
 * Priority 2: Active Tour Match ("En tu ciudad esta semana")
 * Priority 3: Metropolitan Area (30-50 km radius)
 */
export function prioritizeProfilesByLocation(
  profiles: Profile[],
  targetCity: CitySlug,
  currentDateIso: string = new Date().toISOString()
): PrioritizedProfile[] {
  const targetCoords = CITY_COORDINATES[targetCity];

  const results: PrioritizedProfile[] = profiles.map((profile) => {
    // Check Priority 1: Exact Match (Primary city)
    if (profile.citySlugs.includes(targetCity)) {
      return {
        profile,
        priority: 'priority_1_exact',
      };
    }

    // Check Priority 2: Active Tour in targetCity
    const activeTour = profile.tours?.find(
      (tour) =>
        tour.citySlug === targetCity &&
        tour.active &&
        tour.startDate <= currentDateIso &&
        tour.endDate >= currentDateIso
    );

    if (activeTour) {
      return {
        profile,
        priority: 'priority_2_tour',
        activeTourCity: targetCity,
        badgeLabel: 'En tu ciudad esta semana',
      };
    }

    // Check Priority 3: Metropolitan Area (30-50 km radius)
    let minDistanceKm = Infinity;
    for (const primaryCity of profile.citySlugs) {
      const primaryCoords = CITY_COORDINATES[primaryCity];
      if (primaryCoords && targetCoords) {
        const dist = calculateHaversineDistance(targetCoords, primaryCoords);
        if (dist < minDistanceKm) {
          minDistanceKm = dist;
        }
      }
    }

    if (minDistanceKm <= 55) {
      return {
        profile,
        priority: 'priority_3_metropolitan',
        estimatedDistanceKm: minDistanceKm,
        badgeLabel: `A ${minDistanceKm} km de distancia`,
      };
    }

    return {
      profile,
      priority: 'none',
    };
  });

  // Sort results by priority: priority_1 > priority_2 > priority_3 > none
  const priorityOrder: Record<MatchPriority, number> = {
    priority_1_exact: 1,
    priority_2_tour: 2,
    priority_3_metropolitan: 3,
    none: 4,
  };

  return results.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    if (a.estimatedDistanceKm && b.estimatedDistanceKm) {
      return a.estimatedDistanceKm - b.estimatedDistanceKm;
    }
    return 0;
  });
}
