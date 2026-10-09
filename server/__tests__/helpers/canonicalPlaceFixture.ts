import { eq } from 'drizzle-orm';
import { place } from '../../../drizzle/schema/placeAuthority';
import { canonicalListingLocationSchema } from '../../../shared/canonicalListingLocation';
import { getDb } from '../../db';
import { authorizeDatabaseOperation } from '../../_core/databaseAuthority/authorization';
import { resolveDatabaseAuthority } from '../../_core/databaseAuthority/context';
import {
  canonicalListingLocationPersistence,
  resolveCanonicalListingPlace,
} from '../../services/canonicalListingPlaceResolver';

/** Committed Gauteng admission identity; never create a substitute test locality. */
export const CANONICAL_PLACE_FIXTURE_ID = 'pl-place-01-6a145c6d642ba208a2c12de7';

function fixtureDatabase() {
  const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
  if (!['disposable-worktree', 'disposable-test'].includes(authority.context.targetClass)) {
    throw new Error('Canonical Place fixtures require an owned disposable database.');
  }
  authorizeDatabaseOperation(authority);
  return getDb();
}

export async function canonicalPlaceFixtureLocation(address = '1 Integration Fixture Road') {
  const database = await fixtureDatabase();
  const identities = await database
    .select()
    .from(place)
    .where(eq(place.placeId, CANONICAL_PLACE_FIXTURE_ID));
  if (
    identities.length !== 1 ||
    identities[0].searchEligible !== 1 ||
    identities[0].lifecycleStatus !== 'active'
  ) {
    throw new Error(
      'Required admitted North Riding Place fixture is missing or inactive; run governed za-gp Place prepare and verify.',
    );
  }
  const street = /^(\S+)\s+(.+)$/.exec(address);
  if (!street) throw new Error('Test street evidence requires a street number and street name.');
  const location = canonicalListingLocationSchema.parse({
    version: 2,
    canonicalPlaceId: CANONICAL_PLACE_FIXTURE_ID,
    privateAddress: { streetNumber: street[1], streetName: street[2], postalCode: '2169' },
    coordinates: null,
    coordinateSource: 'manual_confirmed',
    locationConfirmationState: 'confirmed',
    publicLocationPrecision: 'approximate',
    providerObservation: null,
  });
  const assignment = await resolveCanonicalListingPlace(location, {
    database,
    propertyType: 'house',
    publication: false,
  });
  if (
    assignment?.execution.scope !== 'locality' ||
    assignment.labels.selected !== 'North Riding' ||
    assignment.labels.province !== 'Gauteng'
  ) {
    throw new Error(
      'Required admitted North Riding fixture has unexpected governed identity or containment.',
    );
  }
  return location;
}

/** For fixtures that deliberately insert persisted listing/projection rows. */
export async function canonicalPlaceFixturePersistence(address?: string) {
  const location = await canonicalPlaceFixtureLocation(address);
  const database = await fixtureDatabase();
  const assignment = await resolveCanonicalListingPlace(location, {
    database,
    propertyType: 'house',
    publication: false,
  });
  return canonicalListingLocationPersistence(location, assignment);
}
