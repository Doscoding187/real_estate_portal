import { PROVINCIAL_CONFIGS } from '../../shared/provincialDiscovery';
import { listCityGuideCandidates } from './geographyAuthorityService';

/**
 * Lightweight discovery for existing city guides, independent of property stock.
 *
 * Place identity comes from the geography authority service. This module owns only the
 * discovery question: which city scopes may be offered as a guide, and in which editorial order.
 */
export async function listCityGuides(limit = 12, provinceSlug?: string, query?: string) {
  return listCityGuideCandidates({
    limit,
    provinceSlug,
    query,
    provinceSlugs: Object.values(PROVINCIAL_CONFIGS).map(province => province.slug),
  });
}
