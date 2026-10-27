import type { LocationNode } from '@/types/location';
import { isCanonicalPlaceId } from '@shared/placeAuthority';

function canonicalIdOf(location: LocationNode): string {
  return String(location.canonicalLocationId || location.id || '').trim();
}

/** Only admitted Place identities can enter public location navigation. */
export function hasCanonicalLocationIdentity(location: LocationNode): boolean {
  return location.type !== 'area' && isCanonicalPlaceId(canonicalIdOf(location));
}

/**
 * Discovery links use the exact path returned by the canonical URL projection.
 * The client never reconstructs a path from display names or hierarchy fields.
 */
export function buildLocationDiscoveryPath(location: LocationNode): string | undefined {
  if (!hasCanonicalLocationIdentity(location)) return undefined;
  const path = String(location.canonicalPath || '');
  if (!path.startsWith('/') || path.includes('?') || path.includes('#')) return undefined;
  const segments = path.split('/').filter(Boolean);
  if (segments.length < 1 || segments.length > 3) return undefined;
  return path;
}
