export const SUBURB_GUIDE_PILOT = {
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  suburbSlug: 'sandton',
} as const;

export function isSuburbGuidePilot(
  provinceSlug: string,
  citySlug: string,
  suburbSlug: string,
): boolean {
  return (
    provinceSlug === SUBURB_GUIDE_PILOT.provinceSlug &&
    citySlug === SUBURB_GUIDE_PILOT.citySlug &&
    suburbSlug === SUBURB_GUIDE_PILOT.suburbSlug
  );
}
