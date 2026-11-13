/**
 * Place pages that are indexable (and prerendered) regardless of listing count.
 * Single source for the server indexability rule, the sitemap and build-time prerender.
 * Every other published place becomes indexable once it has public listings or developments.
 */
export const PLACE_INDEX_ALLOWLIST_PATHS: readonly string[] = [
  '/gauteng',
  '/gauteng/johannesburg',
  '/gauteng/city-of-johannesburg/sandton',
  '/gauteng/randburg/rosebank',
];

const ALLOWLIST_PATH_SET: ReadonlySet<string> = new Set(PLACE_INDEX_ALLOWLIST_PATHS);

export function isPlaceIndexAllowlistedPath(path: string): boolean {
  return ALLOWLIST_PATH_SET.has(path);
}
