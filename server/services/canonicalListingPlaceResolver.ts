import { and, eq, inArray } from 'drizzle-orm';
import { placeName } from '../../drizzle/schema/placeAuthority';
import {
  canonicalListingLocationEvidenceIssues,
  canonicalListingLocationSchema,
  type CanonicalListingLocation,
} from '../../shared/canonicalListingLocation';
import { PLACE_PREFERRED_ROLE, type PlaceScopeExecution } from '../../shared/placeAuthority';
import { executePlace, type PlaceReadDatabase } from './placeDiscoveryService';

export class CanonicalListingPlaceError extends Error {
  constructor(readonly reason: string) {
    super(`Listing location refused: ${reason}`);
  }
}

export interface CanonicalListingPlaceAssignment {
  location: CanonicalListingLocation;
  execution: PlaceScopeExecution;
  /** Presentation only. These labels never establish or replace identity. */
  labels: { selected: string; province: string; city: string | null };
}

/**
 * Validate a Listing assignment on its caller's authorized database/transaction.
 * No connection is opened here and no draft refusal is converted to legacy text.
 * Tier B selection is allowed by D2; SEO publication eligibility is independent.
 */
export async function resolveCanonicalListingPlace(
  input: unknown,
  options: { database: PlaceReadDatabase; propertyType: string; publication: boolean },
): Promise<CanonicalListingPlaceAssignment | null> {
  const parsed = canonicalListingLocationSchema.safeParse(input);
  if (!parsed.success) throw new CanonicalListingPlaceError('invalid_location_boundary');
  const location = parsed.data;
  if (options.publication && location.locationConfirmationState !== 'confirmed') {
    throw new CanonicalListingPlaceError('location_needs_confirmation');
  }
  if (location.canonicalPlaceId === null) return null;

  const resolved = await executePlace(location.canonicalPlaceId, options.database);
  if (!resolved.ok) throw new CanonicalListingPlaceError(resolved.reason);
  if (options.publication) {
    const issues = canonicalListingLocationEvidenceIssues(
      location,
      resolved.execution.scope,
      options.propertyType,
    );
    if (issues.length) throw new CanonicalListingPlaceError(issues.join(' '));
  }
  const execution = resolved.execution;
  const ids = [
    ...new Set(
      [execution.placeId, execution.provincePlaceId, execution.cityPlaceId].filter(
        (id): id is string => id !== null,
      ),
    ),
  ];
  const names = await options.database
    .select({ placeId: placeName.placeId, name: placeName.name })
    .from(placeName)
    .where(
      and(
        inArray(placeName.placeId, ids),
        eq(placeName.nameRole, PLACE_PREFERRED_ROLE),
        eq(placeName.nameState, 'active'),
      ),
    );
  const labels = new Map<string, string>();
  for (const row of names) {
    if (labels.has(row.placeId) || !row.name.trim()) {
      throw new CanonicalListingPlaceError('ambiguous_or_empty_preferred_label');
    }
    labels.set(row.placeId, row.name);
  }
  if (ids.some(id => !labels.has(id)))
    throw new CanonicalListingPlaceError('missing_preferred_label');
  return {
    location,
    execution,
    labels: {
      selected: labels.get(execution.placeId)!,
      province: labels.get(execution.provincePlaceId)!,
      city: execution.cityPlaceId ? labels.get(execution.cityPlaceId)! : null,
    },
  };
}
