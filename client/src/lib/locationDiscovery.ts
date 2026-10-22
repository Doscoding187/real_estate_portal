import type { LocationNode } from '@/types/location';
import { parseCanonicalLocationId } from '@shared/locationAuthority';
import { isCanonicalPlaceId } from '@shared/placeAuthority';
import { PROVINCE_SLUGS } from './locationUtils';

export function isCanonicalProvinceSlug(value: string | undefined): boolean {
  return PROVINCE_SLUGS.includes(
    String(value || '')
      .trim()
      .toLowerCase(),
  );
}

function pathSegment(value: string | undefined): string | undefined {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (!normalized || normalized.includes('/')) return undefined;
  return encodeURIComponent(normalized);
}

function canonicalIdOf(location: LocationNode): string {
  return String(location.canonicalLocationId || location.id || '').trim();
}

export function hasCanonicalLocationIdentity(location: LocationNode): boolean {
  const canonicalId = canonicalIdOf(location);
  // A Place Authority identity is canonical on its own. It does not carry a
  // level in the identifier, and the level it was returned with is the level
  // the authority asserts.
  if (isCanonicalPlaceId(canonicalId)) return true;
  const parsed = parseCanonicalLocationId(canonicalId);
  return Boolean(parsed && parsed.level === location.type);
}

/**
 * The published path the authority returned must agree with the published slugs the result
 * carries.
 *
 * A Place Authority result is linked by the path the server published, because the client
 * cannot rebuild it: the published region segment is the local label the product publishes and
 * is not derivable from the authority's own hierarchy. The slugs the result carries are still
 * the published ones, so a path that names a different city or place than its own slugs is
 * refused rather than linked to.
 */
export function isPublishedPathConsistent(location: LocationNode): boolean {
  const path = String(location.canonicalPath || '');
  if (!path.startsWith('/')) return false;
  const segments = path.split('/').filter(Boolean);
  const province = pathSegment(location.provinceSlug);
  if (!province || segments[0] !== province) return false;
  if (location.type === 'province') return segments.length === 1;

  const own = pathSegment(location.slug);
  if (!own) return false;
  if (location.type === 'city') {
    return segments.length === 2 && segments[1] === own;
  }
  if (location.type !== 'suburb') return false;
  const city = pathSegment(location.citySlug);
  if (!city) return false;
  return segments.length === 3 && segments[1] === city && segments[2] === own;
}

/**
 * Builds the neutral geography-led destination for one canonical location.
 *
 * This intentionally does not reuse the Buy URL builder. A location-only
 * selection has geography, but no transaction intent yet.
 *
 * A Place Authority location is answered with the path the authority published.
 * The server is the published-URL authority, so the client does not rebuild the
 * path from its own slugs and risk offering a second opinion.
 */
export function buildLocationDiscoveryPath(location: LocationNode): string | undefined {
  if (isCanonicalPlaceId(canonicalIdOf(location))) {
    const published = location.canonicalPath;
    if (!published || !published.startsWith('/')) return undefined;
    return published;
  }

  if (!hasCanonicalLocationIdentity(location)) return undefined;

  const slug = pathSegment(location.slug);
  if (!slug) return undefined;

  if (location.type === 'province') {
    return `/${slug}`;
  }

  const provinceSlug = pathSegment(location.provinceSlug);
  if (!provinceSlug) return undefined;

  if (location.type === 'city') {
    return `/${provinceSlug}/${slug}`;
  }

  if (location.type === 'suburb') {
    const citySlug = pathSegment(location.citySlug);
    if (!citySlug) return undefined;
    return `/${provinceSlug}/${citySlug}/${slug}`;
  }

  return undefined;
}
