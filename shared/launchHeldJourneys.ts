/**
 * Journeys held back for the public soft launch. A held journey is NOT released
 * even when VITE_PUBLIC_JOURNEY_RELEASES lists it. Remove a key to release it.
 * Single source of truth for the client navigation and the server sitemap.
 */
export const LAUNCH_HELD_JOURNEYS: readonly string[] = [
  'shared_living',
  'plot_land',
  'commercial',
  'services',
];

export function isLaunchHeldJourney(key: string): boolean {
  return LAUNCH_HELD_JOURNEYS.includes(key);
}

/** Public path prefixes owned by each held-capable journey (a prefix matches itself and sub-paths). */
export const HELD_JOURNEY_PATH_PREFIXES: Readonly<Record<string, readonly string[]>> = {
  shared_living: ['/shared-living'],
  plot_land: ['/plots-and-land', '/land'],
  commercial: ['/commercial'],
  services: ['/services'],
};

/** True when the path belongs to a journey that is currently held. */
export function isHeldJourneyPath(pathname: string): boolean {
  return LAUNCH_HELD_JOURNEYS.some(key =>
    (HELD_JOURNEY_PATH_PREFIXES[key] ?? []).some(
      prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ),
  );
}
