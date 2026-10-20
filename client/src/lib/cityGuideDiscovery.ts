import type {
  CanonicalLocationDiscoveryResult,
  SearchDiscoveryResult,
} from '@shared/searchDiscovery';
import type { CityGuideContent } from '@shared/cityGuideContent';
import type { LocationNode } from '@/types/location';
import { buildLocationDiscoveryPath } from './locationDiscovery';

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
  };
}
export function cityGuideChoices(
  results: readonly SearchDiscoveryResult[],
  guide: Pick<CityGuideContent, 'provinceSlug'>,
  cityId?: number,
) {
  return results
    .filter(
      (result): result is CanonicalLocationDiscoveryResult =>
        result.kind === 'canonical_location' &&
        result.provinceSlug === guide.provinceSlug &&
        (cityId === undefined ||
          (result.factualLevel === 'suburb' &&
            result.parentCanonicalLocationId === `city:${cityId}`)),
    )
    .filter(result => buildLocationDiscoveryPath(guidePlaceNode(result)) === result.canonicalPath);
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
