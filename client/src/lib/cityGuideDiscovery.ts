import type {
  CanonicalLocationDiscoveryResult,
  SearchDiscoveryResult,
} from '@shared/searchDiscovery';
import type { CityGuideContent } from '@shared/cityGuideContent';
import type { LocationNode } from '@/types/location';
import { isPublishedPathConsistent } from './locationDiscovery';

export function guidePlaceNode(result: CanonicalLocationDiscoveryResult): LocationNode {
  return {
    id: result.canonicalLocationId,
    canonicalLocationId: result.canonicalLocationId,
    factualLocationId: result.factualLocationId,
    name: result.label,
    factualType: result.factualType,
    selectionTypeLabel: result.display.typeLabel,
    selectionContextLabel: result.display.contextLabel,
    type: result.factualLevel,
    slug: result.suburbSlug || result.citySlug || result.provinceSlug,
    provinceSlug: result.provinceSlug,
    citySlug: result.citySlug,
    parentCanonicalLocationId: result.parentCanonicalLocationId,
    canonicalPath: result.canonicalPath,
    ...(result.runtimeLocationId ? { runtimeLocationId: result.runtimeLocationId } : {}),
  };
}

/**
 * The places a city guide may offer.
 *
 * A city guide owns one published city scope, and a suburb belongs to it when
 * the published path names that city. The comparison is on the published city
 * scope, not on a runtime parent handle, because the Place Authority asserts a
 * municipality edge and does not always carry the town-cluster edge.
 */
export function cityGuideChoices(
  results: readonly SearchDiscoveryResult[],
  guide: Pick<CityGuideContent, 'provinceSlug'>,
  citySlug?: string,
) {
  return results
    .filter(
      (result): result is CanonicalLocationDiscoveryResult =>
        result.kind === 'canonical_location' &&
        result.provinceSlug === guide.provinceSlug &&
        (citySlug === undefined ||
          (result.factualLevel === 'suburb' && result.citySlug === citySlug)),
    )
    .filter(result => isPublishedPathConsistent(guidePlaceNode(result)));
}
export function exactGuidePlace(
  results: readonly SearchDiscoveryResult[],
  guide: Pick<CityGuideContent, 'provinceSlug'>,
  name: string,
  kind?: 'city' | 'suburb',
) {
  const matches = [
    ...new Map(
      cityGuideChoices(results, guide)
        .filter(
          result =>
            result.label.toLocaleLowerCase() === name.toLocaleLowerCase() &&
            (!kind || result.factualLevel === kind),
        )
        .map(result => [result.canonicalLocationId, result]),
    ).values(),
  ];
  return matches.length === 1 ? matches[0] : undefined;
}
