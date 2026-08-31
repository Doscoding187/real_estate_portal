import { and, desc, eq, ne } from 'drizzle-orm';
import { getDb } from '../db-connection';
import {
  agents,
  cities,
  provinces,
  slPlaceHousehold,
  slModerationQueue,
  slPlaces,
  slSpaceAvailability,
  slSpaces,
  slVerifications,
  suburbs,
} from '../../drizzle/schema';
import { parseCanonicalLocationId } from '../../shared/locationAuthority';
import type {
  SharedLivingAccommodationType,
  SharedLivingMarketTag,
  SharedLivingPlaceKind,
  SharedLivingSpaceStatus,
} from '../../shared/sharedLivingDomain';
import { assertPhoneVerified, hasVerifiedPhone } from './sharedLivingVerificationService';
import { listCurrentAgencyMembershipsForAgent } from './agencyMembershipService';

/**
 * Shared Living authoring keeps a place separate from its rentable spaces.
 * A private owner and an approved practitioner share the same inventory spine;
 * their public attribution is derived from trusted platform records, never a
 * client-supplied label.
 */
export interface CreateSharedLivingDraftInput {
  actorUserId: number;
  actorRole: string | undefined;
  addressLinePrivate: string;
  locationId: string;
  placeKind: SharedLivingPlaceKind;
  description?: string;
  spaceLabel: string;
  accommodationType: SharedLivingAccommodationType;
  marketTag: SharedLivingMarketTag;
  rentAmountMinor?: number;
  rentUnknown?: boolean;
  bills: { electricity: boolean; water: boolean; wifi: boolean };
  availableFrom?: string;
  occupantsCount?: number;
  /** Required for an agent context; reviewer approval verifies this evidence. */
  mandateReference?: string;
}

export interface AddSharedLivingSpaceInput {
  actorUserId: number;
  placeId: number;
  spaceLabel: string;
  accommodationType: SharedLivingAccommodationType;
  marketTag: SharedLivingMarketTag;
  rentAmountMinor?: number;
  rentUnknown?: boolean;
  bills: { electricity: boolean; water: boolean; wifi: boolean };
  availableFrom?: string;
}

export type SpaceUpdatePatch = {
  label?: string;
  rentAmountMinor?: number;
  rentUnknown?: boolean;
  bills?: { electricity: boolean; water: boolean; wifi: boolean };
  availableFrom?: string | null;
  status?: SharedLivingSpaceStatus;
};

type CanonicalPlaceGeography = {
  provinceId: number;
  cityId: number | null;
  suburbId: number | null;
  geoPrecision: 'province' | 'city' | 'suburb';
};

type AuthoringAuthority =
  | { kind: 'owner' }
  | { kind: 'practitioner'; mandateReference: string; agentId: number; agencyId: number };

function failure(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function availabilityValues(input: {
  rentAmountMinor?: number;
  rentUnknown?: boolean;
  bills: { electricity: boolean; water: boolean; wifi: boolean };
  availableFrom?: string | null;
}) {
  const rentUnknown = input.rentUnknown === true;
  const rentAmountMinor =
    input.rentAmountMinor == null ? undefined : Math.round(input.rentAmountMinor);
  if (
    !rentUnknown &&
    (!Number.isSafeInteger(rentAmountMinor) ||
      rentAmountMinor === undefined ||
      rentAmountMinor <= 0)
  ) {
    throw failure('Provide the monthly rent, or mark it as to confirm.', 'RENT_REQUIRED');
  }
  return {
    rentAmountMinor: rentUnknown ? 0 : rentAmountMinor!,
    rentUnknown: rentUnknown ? 1 : 0,
    availableFrom: input.availableFrom || null,
    billsIncludedJson: JSON.stringify(input.bills),
  };
}

async function uniquePlaceSlug(base: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const root = slugify(base) || 'shared-living-place';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 8)}`;
    const [existing] = await db
      .select({ id: slPlaces.id })
      .from(slPlaces)
      .where(eq(slPlaces.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  throw failure('Could not allocate a unique listing path.', 'SLUG_ALLOCATION_FAILED');
}

async function uniqueSpaceSlug(placeSlug: string, label: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const root = `${slugify(placeSlug)}-${slugify(label) || 'space'}`.slice(0, 170);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 8)}`;
    const [existing] = await db
      .select({ id: slSpaces.id })
      .from(slSpaces)
      .where(eq(slSpaces.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  throw failure('Could not allocate a unique space path.', 'SLUG_ALLOCATION_FAILED');
}

async function resolveCanonicalPlaceGeography(
  locationId: string,
): Promise<CanonicalPlaceGeography> {
  const parsed = parseCanonicalLocationId(locationId);
  if (!parsed) {
    throw failure(
      'Choose a canonical city, suburb, or province for this place.',
      'LOCATION_REQUIRED',
    );
  }
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  if (parsed.level === 'province') {
    const [province] = await db
      .select({ id: provinces.id })
      .from(provinces)
      .where(and(eq(provinces.id, parsed.id), ne(provinces.status, 'retired')))
      .limit(1);
    if (!province)
      throw failure(
        'The selected province is not in the canonical location catalogue.',
        'LOCATION_UNKNOWN',
      );
    return { provinceId: province.id, cityId: null, suburbId: null, geoPrecision: 'province' };
  }

  if (parsed.level === 'city') {
    const [city] = await db
      .select({ id: cities.id, provinceId: cities.provinceId })
      .from(cities)
      .innerJoin(provinces, eq(cities.provinceId, provinces.id))
      .where(
        and(
          eq(cities.id, parsed.id),
          ne(cities.status, 'retired'),
          ne(provinces.status, 'retired'),
        ),
      )
      .limit(1);
    if (!city)
      throw failure(
        'The selected city is not in the canonical location catalogue.',
        'LOCATION_UNKNOWN',
      );
    return { provinceId: city.provinceId, cityId: city.id, suburbId: null, geoPrecision: 'city' };
  }

  const [suburb] = await db
    .select({ id: suburbs.id, cityId: suburbs.cityId, provinceId: cities.provinceId })
    .from(suburbs)
    .innerJoin(cities, eq(suburbs.cityId, cities.id))
    .innerJoin(provinces, eq(cities.provinceId, provinces.id))
    .where(
      and(
        eq(suburbs.id, parsed.id),
        ne(suburbs.status, 'retired'),
        ne(cities.status, 'retired'),
        ne(provinces.status, 'retired'),
      ),
    )
    .limit(1);
  if (!suburb)
    throw failure(
      'The selected suburb is not in the canonical location catalogue.',
      'LOCATION_UNKNOWN',
    );
  return {
    provinceId: suburb.provinceId,
    cityId: suburb.cityId,
    suburbId: suburb.id,
    geoPrecision: 'suburb',
  };
}

async function resolveAuthoringAuthority(input: {
  actorUserId: number;
  actorRole: string | undefined;
  mandateReference?: string;
}): Promise<AuthoringAuthority> {
  if (input.actorRole === 'visitor') return { kind: 'owner' };
  if (input.actorRole !== 'agent') {
    throw failure(
      'Only a private owner or approved Property Practitioner can publish Shared Living inventory.',
      'FORBIDDEN',
    );
  }

  const mandateReference = input.mandateReference?.trim();
  if (!mandateReference) {
    throw failure(
      'A mandate reference is required for a Property Practitioner listing.',
      'MANDATE_REQUIRED',
    );
  }

  const { agentId, agencyId } = await assertCurrentApprovedPractitioner(input.actorUserId);
  return { kind: 'practitioner', mandateReference, agentId, agencyId };
}

/**
 * Reuses the canonical agency-membership clock rather than checking only a
 * mutable profile field. This is called both at draft creation and at the
 * moderation boundary, so a lapsed practitioner cannot publish stale work.
 */
async function assertCurrentApprovedPractitioner(
  actorUserId: number,
): Promise<{ agentId: number; agencyId: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [agent] = await db
    .select({
      id: agents.id,
      agencyId: agents.agencyId,
      status: agents.status,
      isVerified: agents.isVerified,
    })
    .from(agents)
    .where(eq(agents.userId, actorUserId))
    .limit(1);
  const agentId = Number(agent?.id || 0);
  const agencyId = Number(agent?.agencyId || 0);
  if (
    !agentId ||
    !agencyId ||
    agent?.status !== 'approved' ||
    Number(agent.isVerified || 0) !== 1
  ) {
    throw failure(
      'An approved practitioner profile and agency affiliation are required.',
      'PRACTITIONER_NOT_APPROVED',
    );
  }

  const memberships = await listCurrentAgencyMembershipsForAgent(db, agentId);
  if (!memberships.some(membership => Number(membership.agencyId) === agencyId)) {
    throw failure(
      'Your active agency membership is required to advertise for a client.',
      'PRACTITIONER_MEMBERSHIP_REQUIRED',
    );
  }

  return { agentId, agencyId };
}

async function writeAtomically<T>(db: any, operation: (tx: any) => Promise<T>): Promise<T> {
  if (typeof db.transaction === 'function') return db.transaction(operation);
  return operation(db);
}

/** Creates a private draft plus its first independently rentable space atomically. */
export async function createSharedLivingDraft(
  input: CreateSharedLivingDraftInput,
): Promise<{ placeId: number; spaceId: number; slug: string }> {
  if (!input.addressLinePrivate.trim()) {
    throw failure('The private property address is required.', 'ADDRESS_REQUIRED');
  }
  const [authority, geography, availability] = await Promise.all([
    resolveAuthoringAuthority(input),
    resolveCanonicalPlaceGeography(input.locationId),
    Promise.resolve(availabilityValues(input)),
  ]);
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const placeSlug = await uniquePlaceSlug(`${input.placeKind}-${input.spaceLabel}-${Date.now()}`);
  const spaceSlug = await uniqueSpaceSlug(placeSlug, input.spaceLabel);

  return writeAtomically(db, async tx => {
    const [placeResult] = await tx.insert(slPlaces).values({
      slug: placeSlug,
      ownerUserId: input.actorUserId,
      addressLinePrivate: input.addressLinePrivate.trim(),
      ...geography,
      placeKind: input.placeKind,
      description: input.description?.trim() || null,
      status: 'draft',
    });
    const placeId = Number(placeResult.insertId);
    const [spaceResult] = await tx.insert(slSpaces).values({
      placeId,
      slug: spaceSlug,
      label: input.spaceLabel.trim(),
      accommodationType: input.accommodationType,
      marketTag: input.marketTag,
      // Drafts are never public; marking a review-ready space available avoids a
      // second visibility transition after an otherwise valid approval.
      status: 'available',
    });
    const spaceId = Number(spaceResult.insertId);
    await tx.insert(slSpaceAvailability).values({ spaceId, ...availability });
    await tx.insert(slPlaceHousehold).values({
      placeId,
      occupantsCount: input.occupantsCount ?? null,
    });
    if (authority.kind === 'practitioner') {
      await tx.insert(slVerifications).values({
        subjectType: 'listing',
        subjectId: placeId,
        rung: 'relationship',
        status: 'pending_evidence',
        evidenceRef: authority.mandateReference,
      });
    }
    return { placeId, spaceId, slug: spaceSlug };
  });
}

/** Adds another space to the same draft place; it never duplicates the address. */
export async function addSharedLivingSpace(
  input: AddSharedLivingSpaceInput,
): Promise<{ spaceId: number; slug: string }> {
  const availability = availabilityValues(input);
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const place = await assertOwnedPlace(input.actorUserId, input.placeId);
  if (place.status !== 'draft' && place.status !== 'paused') {
    throw failure('Add all spaces before submitting this place for review.', 'INVALID_STATE');
  }
  const spaceSlug = await uniqueSpaceSlug(place.slug, input.spaceLabel);
  return writeAtomically(db, async tx => {
    const [spaceResult] = await tx.insert(slSpaces).values({
      placeId: input.placeId,
      slug: spaceSlug,
      label: input.spaceLabel.trim(),
      accommodationType: input.accommodationType,
      marketTag: input.marketTag,
      status: 'available',
    });
    const spaceId = Number(spaceResult.insertId);
    await tx.insert(slSpaceAvailability).values({ spaceId, ...availability });
    return { spaceId, slug: spaceSlug };
  });
}

/** Space-level updates stay scoped to the owner of the parent place. */
export async function updateOwnedSpace(
  actorUserId: number,
  spaceId: number,
  patch: SpaceUpdatePatch,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const ownership = await assertOwnership(actorUserId, spaceId);
  if (ownership.placeStatus === 'pending_review' || ownership.placeStatus === 'archived') {
    throw failure('A listing under review or archived listing cannot be changed.', 'INVALID_STATE');
  }

  const [existingAvailability] = await db
    .select({
      rentAmountMinor: slSpaceAvailability.rentAmountMinor,
      rentUnknown: slSpaceAvailability.rentUnknown,
    })
    .from(slSpaceAvailability)
    .where(eq(slSpaceAvailability.spaceId, spaceId))
    .limit(1);
  if (!existingAvailability)
    throw failure('Space availability is missing.', 'AVAILABILITY_MISSING');

  const nextRentUnknown = patch.rentUnknown ?? Number(existingAvailability.rentUnknown) === 1;
  const nextRentAmount = patch.rentAmountMinor ?? Number(existingAvailability.rentAmountMinor);
  if (!nextRentUnknown && (!Number.isSafeInteger(nextRentAmount) || nextRentAmount <= 0)) {
    throw failure('Provide the monthly rent, or mark it as to confirm.', 'RENT_REQUIRED');
  }

  // Availability status is operational freshness; a material public-fact edit
  // must re-enter the moderation boundary before it appears to consumers.
  const requiresReReview =
    patch.label !== undefined ||
    patch.rentAmountMinor !== undefined ||
    patch.rentUnknown !== undefined ||
    patch.bills !== undefined ||
    patch.availableFrom !== undefined;

  await writeAtomically(db, async tx => {
    if (patch.label !== undefined || patch.status !== undefined) {
      await tx
        .update(slSpaces)
        .set({
          ...(patch.label !== undefined ? { label: patch.label.trim() } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
        })
        .where(eq(slSpaces.id, spaceId));
    }
    const availabilityPatch: Record<string, unknown> = {};
    if (patch.rentAmountMinor !== undefined)
      availabilityPatch.rentAmountMinor = nextRentUnknown ? 0 : Math.round(patch.rentAmountMinor);
    if (patch.rentUnknown !== undefined) availabilityPatch.rentUnknown = patch.rentUnknown ? 1 : 0;
    if (patch.rentUnknown === true) availabilityPatch.rentAmountMinor = 0;
    if (patch.availableFrom !== undefined) availabilityPatch.availableFrom = patch.availableFrom;
    if (patch.bills) availabilityPatch.billsIncludedJson = JSON.stringify(patch.bills);
    if (Object.keys(availabilityPatch).length) {
      await tx
        .update(slSpaceAvailability)
        .set(availabilityPatch)
        .where(eq(slSpaceAvailability.spaceId, spaceId));
    }
    if (ownership.placeStatus === 'published' && requiresReReview) {
      await tx
        .update(slPlaces)
        .set({ status: 'pending_review' })
        .where(eq(slPlaces.id, ownership.placeId));
      await tx.insert(slModerationQueue).values({
        placeId: ownership.placeId,
        action: 'submit',
        reason: 'Material space facts changed after publication.',
      });
    }
  });
}

async function assertOwnership(
  actorUserId: number,
  spaceId: number,
): Promise<{ placeId: number; placeStatus: string }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db
    .select({
      placeId: slSpaces.placeId,
      ownerId: slPlaces.ownerUserId,
      placeStatus: slPlaces.status,
    })
    .from(slSpaces)
    .innerJoin(slPlaces, eq(slSpaces.placeId, slPlaces.id))
    .where(eq(slSpaces.id, spaceId))
    .limit(1);
  if (!row) throw failure('Listing not found.', 'NOT_FOUND');
  if (Number(row.ownerId) !== actorUserId) {
    throw failure('You can only manage your own listings.', 'FORBIDDEN');
  }
  return { placeId: Number(row.placeId), placeStatus: String(row.placeStatus) };
}

async function assertOwnedPlace(actorUserId: number, placeId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [place] = await db
    .select({
      id: slPlaces.id,
      slug: slPlaces.slug,
      ownerId: slPlaces.ownerUserId,
      status: slPlaces.status,
    })
    .from(slPlaces)
    .where(eq(slPlaces.id, placeId))
    .limit(1);
  if (!place) throw failure('Listing not found.', 'NOT_FOUND');
  if (Number(place.ownerId) !== actorUserId)
    throw failure('You can only manage your own listings.', 'FORBIDDEN');
  return { id: Number(place.id), slug: place.slug, status: place.status };
}

async function assertPublicationReadiness(db: any, placeId: number): Promise<void> {
  const [place] = await db
    .select({ provinceId: slPlaces.provinceId })
    .from(slPlaces)
    .where(eq(slPlaces.id, placeId))
    .limit(1);
  if (!place?.provinceId) {
    throw failure(
      'Choose a canonical location before submitting this place for review.',
      'LOCATION_REQUIRED',
    );
  }

  const [space] = await db
    .select({
      id: slSpaces.id,
      rentAmountMinor: slSpaceAvailability.rentAmountMinor,
      rentUnknown: slSpaceAvailability.rentUnknown,
    })
    .from(slSpaces)
    .innerJoin(slSpaceAvailability, eq(slSpaceAvailability.spaceId, slSpaces.id))
    .where(and(eq(slSpaces.placeId, placeId), eq(slSpaces.status, 'available')))
    .limit(1);
  if (!space) {
    throw failure(
      'Add at least one available space before submitting this place for review.',
      'SPACE_REQUIRED',
    );
  }
  if (Number(space.rentUnknown) !== 1 && Number(space.rentAmountMinor) <= 0) {
    throw failure(
      'Every available space needs a rent amount or a clear “to confirm” state.',
      'RENT_REQUIRED',
    );
  }
}

async function practitionerRelationshipEvidence(db: any, placeId: number) {
  const [relationship] = await db
    .select({ id: slVerifications.id, evidenceRef: slVerifications.evidenceRef })
    .from(slVerifications)
    .where(
      and(
        eq(slVerifications.subjectType, 'listing'),
        eq(slVerifications.subjectId, placeId),
        eq(slVerifications.rung, 'relationship'),
        eq(slVerifications.status, 'pending_evidence'),
      ),
    )
    .orderBy(desc(slVerifications.createdAt))
    .limit(1);
  return relationship || null;
}

/** Submitting is the phone-verification boundary; drafts remain safely editable before it. */
export async function submitPlaceForReview(actorUserId: number, placeId: number): Promise<void> {
  await assertPhoneVerified(actorUserId);
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const place = await assertOwnedPlace(actorUserId, placeId);
  if (place.status !== 'draft' && place.status !== 'paused') {
    throw failure('This listing is already under review or published.', 'INVALID_STATE');
  }
  await assertPublicationReadiness(db, placeId);
  // A relationship evidence row is only created for practitioner authoring.
  // Recheck its platform authority when crossing into moderation.
  if (await practitionerRelationshipEvidence(db, placeId)) {
    await assertCurrentApprovedPractitioner(actorUserId);
  }
  await writeAtomically(db, async tx => {
    await tx.update(slPlaces).set({ status: 'pending_review' }).where(eq(slPlaces.id, placeId));
    await tx.insert(slModerationQueue).values({ placeId, action: 'submit' });
  });
}

/** Reviewer approval is the only public publication transition. */
export async function approvePlace(reviewerUserId: number, placeId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [place] = await db
    .select({ ownerUserId: slPlaces.ownerUserId, status: slPlaces.status })
    .from(slPlaces)
    .where(eq(slPlaces.id, placeId))
    .limit(1);
  if (!place) throw failure('Listing not found.', 'NOT_FOUND');
  if (place.status !== 'pending_review') {
    throw failure('Only a listing under review can be approved.', 'INVALID_STATE');
  }
  await assertPhoneVerified(Number(place.ownerUserId));
  await assertPublicationReadiness(db, placeId);
  const relationship = await practitionerRelationshipEvidence(db, placeId);
  if (relationship) await assertCurrentApprovedPractitioner(Number(place.ownerUserId));

  await writeAtomically(db, async tx => {
    await tx.update(slPlaces).set({ status: 'published' }).where(eq(slPlaces.id, placeId));
    await tx.insert(slModerationQueue).values({ placeId, action: 'approve', reviewerUserId });
    await tx.insert(slVerifications).values({
      subjectType: 'listing',
      subjectId: placeId,
      rung: 'property',
      status: 'verified',
      evidenceRef: `moderation:${placeId}`,
      reviewedBy: reviewerUserId,
    });
    if (relationship) {
      await tx.insert(slVerifications).values({
        subjectType: 'listing',
        subjectId: placeId,
        rung: 'relationship',
        status: 'verified',
        evidenceRef: relationship.evidenceRef,
        reviewedBy: reviewerUserId,
      });
    }
  });
}

export async function rejectPlace(
  reviewerUserId: number,
  placeId: number,
  reason: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [place] = await db
    .select({ status: slPlaces.status })
    .from(slPlaces)
    .where(eq(slPlaces.id, placeId))
    .limit(1);
  if (!place) throw failure('Listing not found.', 'NOT_FOUND');
  if (place.status !== 'pending_review') {
    throw failure('Only a listing under review can be rejected.', 'INVALID_STATE');
  }
  await writeAtomically(db, async tx => {
    await tx.update(slPlaces).set({ status: 'draft' }).where(eq(slPlaces.id, placeId));
    await tx.insert(slModerationQueue).values({
      placeId,
      action: 'reject',
      reviewerUserId,
      reason: reason.slice(0, 255),
    });
  });
}

/** Author-facing inventory shows every space below a place, never duplicate places. */
export async function listMyPlaces(actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [phoneVerified, rows] = await Promise.all([
    hasVerifiedPhone(actorUserId),
    db
      .select({
        id: slPlaces.id,
        slug: slPlaces.slug,
        status: slPlaces.status,
        createdAt: slPlaces.createdAt,
        spaceId: slSpaces.id,
        spaceSlug: slSpaces.slug,
        spaceLabel: slSpaces.label,
        spaceStatus: slSpaces.status,
      })
      .from(slPlaces)
      .leftJoin(slSpaces, eq(slSpaces.placeId, slPlaces.id))
      .where(eq(slPlaces.ownerUserId, actorUserId))
      .orderBy(desc(slPlaces.createdAt), slSpaces.sortOrder),
  ]);

  const byPlace = new Map<
    number,
    {
      id: number;
      slug: string;
      status: string;
      createdAt: string;
      spaces: Array<{ id: number; slug: string; label: string; status: string }>;
    }
  >();
  rows.forEach(row => {
    const placeId = Number(row.id);
    let place = byPlace.get(placeId);
    if (!place) {
      place = {
        id: placeId,
        slug: String(row.slug),
        status: String(row.status),
        createdAt: String(row.createdAt),
        spaces: [],
      };
      byPlace.set(placeId, place);
    }
    if (row.spaceId) {
      place.spaces.push({
        id: Number(row.spaceId),
        slug: String(row.spaceSlug),
        label: String(row.spaceLabel),
        status: String(row.spaceStatus),
      });
    }
  });
  return { phoneVerified, places: Array.from(byPlace.values()) };
}

/**
 * Moderator queue facts needed to make a real publication decision. Private
 * street addresses and coordinates are intentionally absent from this DTO.
 */
export async function pendingReviewQueue() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const rows = await db
    .select({
      id: slPlaces.id,
      slug: slPlaces.slug,
      createdAt: slPlaces.createdAt,
      placeKind: slPlaces.placeKind,
      description: slPlaces.description,
      suburbName: suburbs.name,
      cityName: cities.name,
      provinceName: provinces.name,
      spaceId: slSpaces.id,
      spaceLabel: slSpaces.label,
      accommodationType: slSpaces.accommodationType,
      marketTag: slSpaces.marketTag,
      spaceStatus: slSpaces.status,
      rentAmountMinor: slSpaceAvailability.rentAmountMinor,
      rentUnknown: slSpaceAvailability.rentUnknown,
      billsIncludedJson: slSpaceAvailability.billsIncludedJson,
      availableFrom: slSpaceAvailability.availableFrom,
    })
    .from(slPlaces)
    .leftJoin(slSpaces, eq(slSpaces.placeId, slPlaces.id))
    .leftJoin(slSpaceAvailability, eq(slSpaceAvailability.spaceId, slSpaces.id))
    .leftJoin(suburbs, eq(slPlaces.suburbId, suburbs.id))
    .leftJoin(cities, eq(slPlaces.cityId, cities.id))
    .leftJoin(provinces, eq(slPlaces.provinceId, provinces.id))
    .where(eq(slPlaces.status, 'pending_review'))
    .orderBy(desc(slPlaces.createdAt), slSpaces.sortOrder);

  const queue = new Map<
    number,
    {
      id: number;
      slug: string;
      createdAt: string;
      placeKind: string;
      description: string | null;
      locationDisplay: string;
      spaces: Array<{
        id: number;
        label: string;
        accommodationType: string;
        marketTag: string;
        status: string;
        rentAmountMinor: number;
        rentUnknown: boolean;
        billsIncluded: { electricity: boolean; water: boolean; wifi: boolean };
        availableFrom: string | null;
      }>;
    }
  >();

  rows.forEach(row => {
    const placeId = Number(row.id);
    let item = queue.get(placeId);
    if (!item) {
      item = {
        id: placeId,
        slug: String(row.slug),
        createdAt: String(row.createdAt),
        placeKind: String(row.placeKind),
        description: row.description == null ? null : String(row.description),
        locationDisplay:
          [row.suburbName, row.cityName, row.provinceName].filter(Boolean).join(', ') ||
          'Canonical area unavailable',
        spaces: [],
      };
      queue.set(placeId, item);
    }
    if (!row.spaceId) return;
    item.spaces.push({
      id: Number(row.spaceId),
      label: String(row.spaceLabel),
      accommodationType: String(row.accommodationType),
      marketTag: String(row.marketTag),
      status: String(row.spaceStatus),
      rentAmountMinor: Number(row.rentAmountMinor || 0),
      rentUnknown: Number(row.rentUnknown) === 1,
      billsIncluded: parseModerationBills(row.billsIncludedJson),
      availableFrom: row.availableFrom ? String(row.availableFrom).slice(0, 10) : null,
    });
  });
  return Array.from(queue.values());
}

function parseModerationBills(value: unknown): {
  electricity: boolean;
  water: boolean;
  wifi: boolean;
} {
  let candidate = value;
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      candidate = null;
    }
  }
  const bills =
    candidate && typeof candidate === 'object' ? (candidate as Record<string, unknown>) : {};
  return {
    electricity: Boolean(bills.electricity),
    water: Boolean(bills.water),
    wifi: Boolean(bills.wifi),
  };
}
