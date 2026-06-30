import { FALLBACK_CITY_LINKS } from './locationDataAdapter';

/**
 * A single suggestion from the Search Discovery Engine foundation.
 *
 * Properties align with future backend-powered suggestions while
 * the static fallback layer remains active.
 *
 * shape:
 *   label            – human-readable display name
 *   type             – "city" | "suburb"
 *   provinceSlug     – canonical province slug
 *   citySlug         – canonical city slug (undefined for province-level)
 *   suburbSlug       – canonical suburb slug (undefined for city/province-level)
 *   canonicalPath    – full path-based URL for navigation
 *   source           – origin identifier ("fallback" | …)
 */
export interface SearchDiscoverySuggestion {
  label: string;
  type: 'province' | 'city' | 'suburb';
  provinceSlug: string;
  citySlug?: string;
  suburbSlug?: string;
  canonicalPath: string;
  source: 'database' | 'fallback';
  listingCount?: number;
}

/**
 * Returns static, adapter-safe location suggestions filtered by query.
 *
 * Uses FALLBACK_CITY_LINKS — the same static safety-fallback data used
 * by the nav engine.  No backend API calls, no ranking, no personalisation.
 *
 * Designed to be replaced by the future Search Discovery Engine API
 * which will provide signals like inventory, popularity, trend momentum,
 * user intent, proximity, and recent behaviour.
 *
 * @param query  User's search input (case-insensitive substring match)
 * @param limit  Max results to return (default 6)
 */
export function getSearchDiscoverySuggestions(
  query: string,
  limit = 6,
): SearchDiscoverySuggestion[] {
  const lower = query.toLowerCase().trim();
  if (lower.length < 2) return [];

  return FALLBACK_CITY_LINKS
    .filter(link => {
      if (!link.label) return false;
      return link.label.toLowerCase().includes(lower);
    })
    .slice(0, limit)
    .map(link => ({
      label: link.label,
      type: link.type as 'city' | 'suburb',
      provinceSlug: link.provinceSlug,
      citySlug: link.citySlug,
      suburbSlug: link.suburbSlug,
      canonicalPath: link.href,
      source: 'fallback' as const,
    }));
}
