import { and, eq, inArray } from 'drizzle-orm';
import { place, placeName } from '../../drizzle/schema/placeAuthority';
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
  placeType: string;
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
  options: {
    database: PlaceReadDatabase;
    propertyType: string;
    publication: boolean;
    lock?: boolean;
  },
): Promise<CanonicalListingPlaceAssignment | null> {
  const parsed = canonicalListingLocationSchema.safeParse(input);
  if (!parsed.success) throw new CanonicalListingPlaceError('invalid_location_boundary');
  const location = parsed.data;
  if (options.publication && location.locationConfirmationState !== 'confirmed') {
    throw new CanonicalListingPlaceError('location_needs_confirmation');
  }
  if (location.canonicalPlaceId === null) return null;

  const resolved = await executePlace(location.canonicalPlaceId, options.database, {
    lock: options.lock,
  });
  if (!resolved.ok) throw new CanonicalListingPlaceError(resolved.reason);
  if (options.publication || location.locationConfirmationState === 'confirmed') {
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
  const nameQuery = options.database
    .select({ placeId: placeName.placeId, name: placeName.name, placeType: place.placeType })
    .from(placeName)
    .innerJoin(place, eq(place.placeId, placeName.placeId))
    .where(
      and(
        inArray(placeName.placeId, ids),
        eq(placeName.nameRole, PLACE_PREFERRED_ROLE),
        eq(placeName.nameState, 'active'),
      ),
    );
  const names = await (options.lock ? nameQuery.for('update') : nameQuery);
  const labels = new Map<string, string>();
  for (const row of names) {
    if (labels.has(row.placeId) || !row.name.trim()) {
      throw new CanonicalListingPlaceError('ambiguous_or_empty_preferred_label');
    }
    labels.set(row.placeId, row.name);
  }
  if (ids.some(id => !labels.has(id)))
    throw new CanonicalListingPlaceError('missing_preferred_label');
  const selectedType = names.find(row => row.placeId === execution.placeId)?.placeType;
  if (!selectedType) throw new CanonicalListingPlaceError('missing_place_type');
  return {
    location,
    execution,
    placeType: selectedType,
    labels: {
      selected: labels.get(execution.placeId)!,
      province: labels.get(execution.provincePlaceId)!,
      city: execution.cityPlaceId ? labels.get(execution.cityPlaceId)! : null,
    },
  };
}

/** Persist only identity and its derived labels; never copy competing handles. */
export function canonicalListingLocationPersistence(
  input: unknown,
  assignment: CanonicalListingPlaceAssignment | null,
) {
  const location = canonicalListingLocationSchema.parse(input);
  if (
    (location.canonicalPlaceId !== null && !assignment) ||
    (assignment &&
      (assignment.execution.placeId !== location.canonicalPlaceId ||
        JSON.stringify(canonicalListingLocationSchema.parse(assignment.location)) !==
          JSON.stringify(location)))
  )
    throw new CanonicalListingPlaceError('assignment_does_not_match_location');
  const privateAddress = location.privateAddress;
  return {
    canonicalPlaceId: location.canonicalPlaceId,
    provinceId: null,
    cityId: null,
    suburbId: null,
    locationId: null,
    city: assignment?.labels.city ?? '',
    province: assignment?.labels.province ?? '',
    suburb: assignment?.execution.scope === 'locality' ? assignment.labels.selected : null,
    address:
      [privateAddress?.streetNumber, privateAddress?.streetName].filter(Boolean).join(' ') ||
      privateAddress?.farmOrHoldingName ||
      null,
    postalCode: privateAddress?.postalCode ?? null,
    latitude: location.coordinates?.latitude.toFixed(7) ?? null,
    longitude: location.coordinates?.longitude.toFixed(7) ?? null,
    privateAddress,
    coordinateSource: location.coordinateSource,
    locationConfirmationState: location.locationConfirmationState,
    publicLocationPrecision: location.publicLocationPrecision,
    placeId: location.providerObservation?.providerPlaceId ?? null,
  };
}

const FLAT_LISTING_LOCATION_FIELDS = [
  'canonicalPlaceId',
  'provinceId',
  'cityId',
  'suburbId',
  'locationId',
  'city',
  'province',
  'suburb',
  'latitude',
  'longitude',
  'privateAddress',
  'coordinateSource',
  'locationConfirmationState',
  'publicLocationPrecision',
  'placeId',
  'address',
  'postalCode',
];
export function assertNoFlatListingLocationInput(input: Record<string, unknown>): void {
  if (FLAT_LISTING_LOCATION_FIELDS.some(key => Object.prototype.hasOwnProperty.call(input, key)))
    throw new CanonicalListingPlaceError('flat_location_write_is_not_authority');
}
