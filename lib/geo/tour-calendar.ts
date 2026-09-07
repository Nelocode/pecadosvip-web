import type { CitySlug, TourItinerary } from '../content/types.ts';

export type TourCalendarEntry = {
  modelId: string;
  modelSlug: string;
  displayName: string;
  tour: TourItinerary;
  daysRemaining: number;
};

export function getActiveToursForCity(
  tours: Array<{ modelId: string; modelSlug: string; displayName: string; tour: TourItinerary }>,
  targetCity: CitySlug,
  currentDateIso: string = new Date().toISOString()
): TourCalendarEntry[] {
  return tours
    .filter(
      (item) =>
        item.tour.citySlug === targetCity &&
        item.tour.active &&
        item.tour.startDate <= currentDateIso &&
        item.tour.endDate >= currentDateIso
    )
    .map((item) => {
      const endMs = new Date(item.tour.endDate).getTime();
      const nowMs = new Date(currentDateIso).getTime();
      const diffDays = Math.max(0, Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24)));

      return {
        modelId: item.modelId,
        modelSlug: item.modelSlug,
        displayName: item.displayName,
        tour: item.tour,
        daysRemaining: diffDays,
      };
    });
}
