import { MULTI_LOCATION_MAX } from '../../../shared/searchScope';
import type { SearchIntent } from './searchIntent';

/** Every Place the search is scoped to, in selection order (empty for a country-wide search). */
export function selectedPlaceIds(intent: SearchIntent): string[] {
  const { canonicalPlaceId, canonicalPlaceIds } = intent.geography;
  if (canonicalPlaceIds?.length) return [...canonicalPlaceIds];
  return canonicalPlaceId ? [canonicalPlaceId] : [];
}

/**
 * Adds one nearby Place to the search. Duplicates are ignored and the selection never
 * exceeds MULTI_LOCATION_MAX; the page resets because the result set changes.
 */
export function addAreaToIntent(intent: SearchIntent, placeId: string): SearchIntent {
  const current = selectedPlaceIds(intent);
  if (!current.length) return intent;
  const next = [...new Set([...current, placeId])].slice(0, MULTI_LOCATION_MAX);
  if (next.length === current.length) return intent;
  return {
    ...intent,
    geography: {
      level: 'canonical_place',
      canonicalPlaceId: next[0],
      ...(next.length > 1 ? { canonicalPlaceIds: next } : {}),
    },
    resultState: { ...intent.resultState, page: 0 },
  };
}

/** "Sandton" for one area, "A and B" for two, "Sandton and 9 surrounding areas" for more. */
export function summariseSelectedAreas(labels: readonly string[]): string | undefined {
  const names = labels.map(label => label.trim()).filter(Boolean);
  if (!names.length) return undefined;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} and ${names.length - 1} surrounding areas`;
}
