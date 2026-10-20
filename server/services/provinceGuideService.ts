import { getProvinceGuideContent } from '../../shared/provinceGuideContent';
import { publicSearchService } from './publicSearchService';
import { listVerifiedPlaceScopes, resolveVerifiedProvinceScope } from './geographyAuthorityService';

/** Editorial links require exact verified parent/child identities; no widening or name fallback. */
export async function getProvinceGuidePlaces(provinceSlug: string) {
  const guide = getProvinceGuideContent(provinceSlug);
  if (!guide) return null;
  const province = await resolveVerifiedProvinceScope(provinceSlug);
  if (!province) return null;
  const slugs = [
    ...new Set(guide.regions.flatMap(region => region.places.map(place => place.placeSlug))),
  ];
  const places = await listVerifiedPlaceScopes({ provinceId: province.id, slugs });
  return {
    province,
    places,
  };
}

/** Platform availability, not a price index. Uses the existing publication/entitlement authority. */
export async function getProvinceGuideInventory(provinceSlug: string) {
  const places = await getProvinceGuidePlaces(provinceSlug);
  if (!places) return null;
  const results = await Promise.allSettled(
    (['sale', 'rent'] as const).map(async listingType => {
      const result = await publicSearchService.searchInventory({
        locationId: places.province.canonicalLocationId,
        listingType,
        page: 0,
        pageSize: 1,
      });
      if (!Number.isSafeInteger(result.total) || result.total < 0)
        throw new Error('Invalid public inventory count');
      return result.total;
    }),
  );
  const count = (result: PromiseSettledResult<number>) =>
    result.status === 'fulfilled'
      ? { state: 'ready' as const, total: result.value }
      : { state: 'unavailable' as const, total: null };
  return {
    sale: count(results[0]),
    rent: count(results[1]),
    observedAt: new Date().toISOString(),
    scope: places.province.canonicalLocationId,
  };
}
