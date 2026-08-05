import type { LocationNode } from '@/types/location';
import { parseCanonicalLocationId } from '@shared/locationAuthority';
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

export function hasCanonicalLocationIdentity(location: LocationNode): boolean {
  const canonicalId = String(location.canonicalLocationId || location.id || '').trim();
  const parsed = parseCanonicalLocationId(canonicalId);
  return Boolean(parsed && parsed.level === location.type);
}

/**
 * Builds the neutral geography-led destination for one canonical location.
 *
 * This intentionally does not reuse the Buy URL builder. A location-only
 * selection has geography, but no transaction intent yet.
 */
export function buildLocationDiscoveryPath(location: LocationNode): string | undefined {
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
