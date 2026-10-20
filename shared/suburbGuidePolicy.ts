import { getCityGuideContent } from './cityGuideContent';

export const SUBURB_GUIDE_PILOT = {
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  suburbSlug: 'sandton',
  /** City guide chapter that explains where the pilot suburb sits in its metro. */
  cityContextRegionId: 'e',
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

/**
 * The pilot suburb has no separately reviewed article. Its editorial context and its
 * publication readiness belong to the city guide that owns it, so there is one authority
 * for the decision. Local review is not publication: an unpublished city guide keeps the
 * pilot suburb out of the guide sitemap and keeps its route noindex.
 */
export function isPublishedSuburbGuide(
  provinceSlug: string,
  citySlug: string,
  suburbSlug: string,
): boolean {
  if (!isSuburbGuidePilot(provinceSlug, citySlug, suburbSlug)) return false;
  return getCityGuideContent(provinceSlug, citySlug)?.status === 'published';
}

/** One title and description source for the suburb guide route, so the delivered document,
 *  the rendered page and the guide sitemap cannot drift apart. */
export function suburbGuideTitle(suburbName: string): string {
  return `${suburbName} property guide: homes, rentals & developments | Property Listify`;
}

export function suburbGuideDescription(suburbName: string, cityName: string): string {
  return `Explore homes for sale, rentals and new developments in ${suburbName}, ${cityName}.`;
}

/** Published suburb guide routes for the guide sitemap. The pilot is the only suburb with an
 *  authored editorial context, so it is the only suburb that can ever be listed. */
export function getPublishedSuburbGuidePaths(): readonly string[] {
  const { provinceSlug, citySlug, suburbSlug } = SUBURB_GUIDE_PILOT;
  if (!isPublishedSuburbGuide(provinceSlug, citySlug, suburbSlug)) return [];
  return [`${provinceSlug}/${citySlug}/${suburbSlug}`];
}
