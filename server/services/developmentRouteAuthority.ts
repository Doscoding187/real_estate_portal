const DEVELOPMENT_ROOT_PREFIX = '/development/';

export type DevelopmentRouteIdentity = {
  id: number;
  slug?: string | null;
};

/**
 * The public development root is currently a single route segment.  This
 * helper is the server-owned route identity used by supersession redirects;
 * callers must not substitute a raw, non-unique slug lookup.
 */
export function buildDevelopmentRootPath(identity: DevelopmentRouteIdentity): string {
  const segment = String(identity.slug ?? '').trim() || String(identity.id);
  return `${DEVELOPMENT_ROOT_PREFIX}${encodeURIComponent(segment)}`;
}

/**
 * Normalizes only the route identity. Query strings and fragments are not part
 * of a reserved historical root path.
 */
export function normalizeDevelopmentRootPath(pathname: string): string | null {
  if (typeof pathname !== 'string' || pathname.trim() === '') return null;

  let parsedPath: string;
  try {
    parsedPath = new URL(pathname, 'http://property-listify.local').pathname;
  } catch {
    return null;
  }

  const segments = parsedPath.split('/').filter(Boolean);
  if (segments.length !== 2 || segments[0] !== 'development') return null;

  let segment: string;
  try {
    segment = decodeURIComponent(segments[1]).trim();
  } catch {
    return null;
  }

  if (!segment || segment.includes('/')) return null;
  return `${DEVELOPMENT_ROOT_PREFIX}${encodeURIComponent(segment)}`;
}

export function isDevelopmentRootPath(pathname: string): boolean {
  return normalizeDevelopmentRootPath(pathname) !== null;
}
