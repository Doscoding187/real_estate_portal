import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '../db-connection';
import {
  slPlaceHousehold,
  slPlaces,
  slSpaceAvailability,
  slSpaces,
  slModerationQueue,
} from '../../drizzle/schema';
import { assertPhoneVerified, hasVerifiedPhone } from './sharedLivingVerificationService';

/**
 * Shared Living authoring: dynamic by relationship, single spine.
 *
 * MVP covers the private owner/lister relationship. Practitioner authoring
 * reuses this spine behind the existing practitioner identity/mandate
 * system; operator tooling is Phase 2. Every publish-path mutation is gated
 * on the phone-verification rung.
 */

export interface CreateSharedLivingDraftInput {
  actorUserId: number;
  // Place
  addressLinePrivate: string;
  provinceSlug?: string;
  citySlug?: string;
  suburbSlug?: string;
  placeKind: 'house' | 'apartment' | 'townhouse' | 'student_residence' | 'other';
  description?: string;
  // First space
  spaceLabel: string;
  accommodationType:
    | 'private_room'
    | 'shared_room'
    | 'en_suite_room'
    | 'garden_cottage'
    | 'granny_flat'
    | 'bachelor_studio'
    | 'backyard_room'
    | 'backyard_unit'
    | 'room_shared_house'
    | 'room_shared_apartment';
  marketTag: 'room_share' | 'independent_micro' | 'student';
  rentAmountMinor?: number;
  rentUnknown?: boolean;
  bills: { electricity: boolean; water: boolean; wifi: boolean };
  availableFrom?: string;
  // Household (optional at draft)
  occupantsCount?: number;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function uniqueSlug(base: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const root = slugify(base) || 'place';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 8)}`;
    const [existing] = await db
      .select({ id: slPlaces.id })
      .from(slPlaces)
      .where(eq(slPlaces.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  throw new Error('Could not allocate a unique listing path.');
}

async function resolveGeography(input: {
  provinceSlug?: string;
  citySlug?: string;
  suburbSlug?: string;
}): Promise<{ provinceId?: number; cityId?: number; suburbId?: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { provinces, cities, suburbs } = await import('../../drizzle/schema');
  const out: { provinceId?: number; cityId?: number; suburbId?: number } = {};
  if (input.suburbSlug) {
    const [row] = await db.select({ id: suburbs.id }).from(suburbs).where(eq(suburbs.slug, input.suburbSlug)).limit(1);
    if (row) out.suburbId = row.id;
  }
  if (input.citySlug) {
    const [row] = await db.select({ id: cities.id }).from(cities).where(eq(cities.slug, input.citySlug)).limit(1);
    if (row) out.cityId = row.id;
  }
  if (input.provinceSlug) {
    const [row] = await db.select({ id: provinces.id }).from(provinces).where(eq(provinces.slug, input.provinceSlug)).limit(1);
    if (row) out.provinceId = row.id;
  }
  return out;
}

/**
 * Owner/lister draft creation. Creates the place in `draft` with its first
 * space (`hidden`) plus availability and household defaults. Publishing runs
 * through submitForReview → moderation.
 */
export async function createSharedLivingDraft(
  input: CreateSharedLivingDraftInput,
): Promise<{ placeId: number; spaceId: number; slug: string }> {
  await assertPhoneVerified(input.actorUserId);
  if (!input.addressLinePrivate.trim()) {
    throw Object.assign(new Error('The property address is required.'), { code: 'ADDRESS_REQUIRED' });
  }
  const rentAmountMinor =
    input.rentUnknown === true ? undefined : input.rentAmountMinor;
  if (input.rentUnknown !== true && (rentAmountMinor === undefined || !(rentAmountMinor > 0))) {
    throw Object.assign(new Error('Provide the monthly rent, or mark it as to confirm.'), {
      code: 'RENT_REQUIRED',
    });
  }

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const geo = await resolveGeography(input);
  const slug = await uniqueSlug(`${input.placeKind} ${input.spaceLabel} ${Date.now()}`);

  const [place] = await db
    .insert(slPlaces)
    .values({
      slug,
      ownerUserId: input.actorUserId,
      addressLinePrivate: input.addressLinePrivate.trim(),
      geoPrecision: input.suburbSlug ? 'suburb' : input.citySlug ? 'city' : 'province',
      placeKind: input.placeKind,
      description: input.description?.trim() || null,
      status: 'draft',
      ...geo,
    });
  const placeId = Number((place as any).insertId);

  const spaceSlug = `${slug}-1`;
  const [space] = await db
    .insert(slSpaces)
    .values({
      placeId,
      slug: spaceSlug,
      label: input.spaceLabel.trim(),
      accommodationType: input.accommodationType,
      marketTag: input.marketTag,
      status: 'hidden',
    });
  const spaceId = Number((space as any).insertId);

  await db.insert(slSpaceAvailability).values({
    spaceId,
    rentAmountMinor: rentAmountMinor === undefined ? 0 : Math.round(rentAmountMinor),
    rentUnknown: input.rentUnknown === true ? 1 : 0,
    availableFrom: input.availableFrom || null,
    billsIncludedJson: JSON.stringify(input.bills),
  });

  await db.insert(slPlaceHousehold).values({
    placeId,
    occupantsCount: input.occupantsCount ?? null,
  });

  // Public identity is the space slug (detail route keys on it).
  return { placeId, spaceId, slug: spaceSlug };
}

export type SpaceUpdatePatch = {
  label?: string;
  rentAmountMinor?: number;
  rentUnknown?: boolean;
  bills?: { electricity: boolean; water: boolean; wifi: boolean };
  availableFrom?: string | null;
  status?: 'available' | 'occupied' | 'paused' | 'hidden';
};

/** Space-level updates stay within the owner's own unpublished/published places. */
export async function updateOwnedSpace(
  actorUserId: number,
  spaceId: number,
  patch: SpaceUpdatePatch,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await assertOwnership(actorUserId, spaceId);

  if (patch.label !== undefined || patch.status !== undefined) {
    await db
      .update(slSpaces)
      .set({
        ...(patch.label !== undefined ? { label: patch.label.trim() } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
      })
      .where(eq(slSpaces.id, spaceId));
  }

  const availabilityPatch: Record<string, unknown> = {};
  if (patch.rentAmountMinor !== undefined) availabilityPatch.rentAmountMinor = patch.rentAmountMinor;
  if (patch.rentUnknown !== undefined) availabilityPatch.rentUnknown = patch.rentUnknown ? 1 : 0;
  if (patch.availableFrom !== undefined) availabilityPatch.availableFrom = patch.availableFrom;
  if (patch.bills) availabilityPatch.billsIncludedJson = JSON.stringify(patch.bills);
  if (Object.keys(availabilityPatch).length) {
    await db.update(slSpaceAvailability).set(availabilityPatch).where(eq(slSpaceAvailability.spaceId, spaceId));
  }
}

async function assertOwnership(actorUserId: number, spaceId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db
    .select({ id: slSpaces.id, placeId: slSpaces.placeId, ownerId: slPlaces.ownerUserId })
    .from(slSpaces)
    .innerJoin(slPlaces, eq(slSpaces.placeId, slPlaces.id))
    .where(eq(slSpaces.id, spaceId))
    .limit(1);
  if (!row) throw Object.assign(new Error('Listing not found.'), { code: 'NOT_FOUND' });
  if (Number(row.ownerId) !== actorUserId) {
    throw Object.assign(new Error('You can only manage your own listings.'), { code: 'FORBIDDEN' });
  }
  return row.placeId;
}

/**
 * Submit a place for moderation review. Gate: creator phone rung verified.
 */
export async function submitPlaceForReview(actorUserId: number, placeId: number): Promise<void> {
  await assertPhoneVerified(actorUserId);
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [place] = await db
    .select({ id: slPlaces.id, ownerId: slPlaces.ownerUserId, status: slPlaces.status })
    .from(slPlaces)
    .where(eq(slPlaces.id, placeId))
    .limit(1);
  if (!place) throw Object.assign(new Error('Listing not found.'), { code: 'NOT_FOUND' });
  if (Number(place.ownerId) !== actorUserId) {
    throw Object.assign(new Error('You can only submit your own listings.'), { code: 'FORBIDDEN' });
  }
  if (place.status !== 'draft' && place.status !== 'paused') {
    throw Object.assign(new Error('This listing is already under review or published.'), {
      code: 'INVALID_STATE',
    });
  }

  await db.update(slPlaces).set({ status: 'pending_review' }).where(eq(slPlaces.id, placeId));
  await db.insert(slModerationQueue).values({ placeId, action: 'submit' });
}

export async function approvePlace(reviewerUserId: number, placeId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(slPlaces).set({ status: 'published' }).where(eq(slPlaces.id, placeId));
  await db.insert(slModerationQueue).values({
    placeId,
    action: 'approve',
    reviewerUserId,
  });
}

export async function rejectPlace(
  reviewerUserId: number,
  placeId: number,
  reason: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(slPlaces).set({ status: 'draft' }).where(eq(slPlaces.id, placeId));
  await db.insert(slModerationQueue).values({
    placeId,
    action: 'reject',
    reviewerUserId,
    reason: reason.slice(0, 255),
  });
}

/** Places owned by a lister, newest first (owner inbox surface). */
export async function listMyPlaces(actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const phoneVerified = await hasVerifiedPhone(actorUserId);
  const rows = await db
    .select({
      id: slPlaces.id,
      slug: slPlaces.slug,
      status: slPlaces.status,
      createdAt: slPlaces.createdAt,
    })
    .from(slPlaces)
    .where(eq(slPlaces.ownerUserId, actorUserId))
    .orderBy(desc(slPlaces.createdAt));
  return { phoneVerified, places: rows };
}

/** Pending review queue for moderators. */
export async function pendingReviewQueue() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db
    .select({
      id: slPlaces.id,
      slug: slPlaces.slug,
      createdAt: slPlaces.createdAt,
    })
    .from(slPlaces)
    .where(eq(slPlaces.status, 'pending_review'))
    .orderBy(desc(slPlaces.createdAt));
}
