import type { LocationNode } from '@/types/location';
import type { SearchDiscoveryResult } from '@shared/searchDiscovery';
import { isSearchAreaId, type SearchJourneyId } from '@shared/searchScope';
import { parseCanonicalLocationId } from '@shared/locationAuthority';
import type { HomeAreaSelection } from '@/contexts/HomeSearchContext';
import { hasCanonicalLocationIdentity } from '@/lib/locationDiscovery';

export function isBroadHomeLocation(location: LocationNode) {
  // Factual "town" does not mean a small shopping area. Both cities and towns
  // can use the metro_city runtime scope; clarify it without changing identity.
  return location.type === 'province' || location.type === 'city';
}
export function needsHomeAreaClarification(selection: HomeAreaSelection) {
  return (
    !selection.searchArea &&
    (selection.locations.length === 0 ||
      (selection.locations.length === 1 && isBroadHomeLocation(selection.locations[0])))
  );
}
export function homeAreaFromDiscovery(
  result: SearchDiscoveryResult,
  journey: SearchJourneyId,
): HomeAreaSelection | null {
  if (result.kind === 'search_area') {
    if (
      !isSearchAreaId(result.searchAreaId) ||
      !result.publicEligible ||
      result.availability !== 'available' ||
      !result.supportedJourneys.includes(journey)
    )
      return null;
    return {
      searchArea: result,
      locations: [
        {
          id: result.searchAreaId,
          searchAreaId: result.searchAreaId,
          name: result.label,
          slug: result.publicSlug || '',
          type: 'area',
          selectionKind: 'search_area',
        },
      ],
    };
  }
  if (
    ['local_municipality', 'district_municipality', 'metropolitan_municipality'].includes(
      result.factualType || '',
    )
  )
    return null;
  const parsed = parseCanonicalLocationId(result.canonicalLocationId);
  if (!parsed || parsed.level !== result.factualLevel) return null;
  const slug =
    parsed.level === 'suburb'
      ? result.suburbSlug
      : parsed.level === 'city'
        ? result.citySlug
        : result.provinceSlug;
  if (!slug) return null;
  const location: LocationNode = {
    id: result.canonicalLocationId,
    canonicalLocationId: result.canonicalLocationId,
    factualLocationId: result.factualLocationId,
    factualType: result.factualType,
    name: result.label,
    slug,
    type: parsed.level,
    provinceSlug: result.provinceSlug,
    citySlug: result.citySlug,
    parentCanonicalLocationId: result.parentCanonicalLocationId,
    canonicalPath: result.canonicalPath,
    selectionTypeLabel: result.display.typeLabel,
    selectionContextLabel: result.display.contextLabel,
  };
  return hasCanonicalLocationIdentity(location)
    ? { locations: [location], searchArea: null }
    : null;
}
