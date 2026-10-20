/**
 * Place readiness: one authority for "may this place be used".
 *
 * The runtime projection carries a tier, and the runtime reads that tier as the answer to
 * whether a place may be searched, offered as a city guide and listed in the guide sitemap.
 * The tier was set by a promotion rule that answered a different question — whether a place's
 * type was settled — so a place could be real, correctly placed and legally released and
 * still be hidden.
 *
 * The canonical Place release policy already answers the question this runtime asks:
 *
 *   - `permissive_supported` and `mixed_odbl_supported` are released;
 *   - `osm_only_odbl_provisional` identities are held out of the protected release.
 *
 * A place that reaches the runtime through an accepted parent edge and a ready projection is
 * released exactly when the production release policy releases it. The tier follows the
 * release policy, so the two can never disagree.
 *
 * Type confidence remains a separate fact. It is not a licence to hide a place, and this
 * module does not read it.
 */

/** The licensing classifications the protected Place release policy releases. */
export const RELEASED_PLACE_LICENSING = ['permissive_supported', 'mixed_odbl_supported'] as const;

/** The licensing classification the protected Place release policy holds. */
export const HELD_PLACE_LICENSING = 'osm_only_odbl_provisional';

export type PlaceRuntimeStatus = 'verified' | 'provisional';

export function isReleasedPlaceLicensing(licensingClassification?: string): boolean {
  return (RELEASED_PLACE_LICENSING as readonly string[]).includes(licensingClassification ?? '');
}

export interface PlaceReadinessInput {
  /** The tier the projection recorded. A carried row has no tier of its own. */
  publicationStatus?: 'verified' | 'provisional';
  /** The licensing classification of the underlying Place. */
  licensingClassification?: string;
}

/**
 * The runtime status of a place.
 *
 * A place is provisional only when the production release policy holds it. Everything the
 * policy releases is usable, whether or not the projection settled its type.
 */
export function runtimePlaceStatus(input: PlaceReadinessInput): PlaceRuntimeStatus {
  if (input.publicationStatus !== 'provisional') return 'verified';
  return isReleasedPlaceLicensing(input.licensingClassification) ? 'verified' : 'provisional';
}
