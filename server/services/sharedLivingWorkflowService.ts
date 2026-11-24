import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lte,
  ne,
  or,
  isNull,
  sql,
} from 'drizzle-orm';
import {
  place,
  placeName,
  slListingAuthorities,
  slListingAuthorityEvidence,
  slListingAuthorityEvents,
  slModerationQueue,
  slPlaceMedia,
  slPlaceSpecifications,
  slPlaces,
  slResponsibleParties,
  slSpaceAvailability,
  slSpaceMedia,
  slSpaceSpecifications,
  slSpaces,
} from '../../drizzle/schema';
import { executePlace } from './placeDiscoveryService';
import { getDb } from '../db-connection';
import { assertUploadedMediaObject } from '../_core/imageUpload';
import { getMediaStorageAdapter, resolveMediaDeliveryUrl } from '../_core/mediaStorage';
import { SHARED_LIVING_ACCOMMODATION_TYPES, SHARED_LIVING_MARKET_TAGS } from '../../shared/sharedLivingDomain';
import {
  createSharedLivingEvidenceDeliveryToken,
  createSharedLivingEvidenceS3DeliveryUrl,
  createSharedLivingEvidenceS3UploadUrl,
  createSharedLivingEvidenceUploadReservation,
  inspectSharedLivingEvidenceS3Object,
  verifySharedLivingEvidenceUploadReservation,
} from './sharedLivingEvidenceStorage';

const PUBLIC_PAGE_SIZE = 24;
const ACTIVE_AUTHORITY_STATES = ['approved'] as const;
const BILLS = ['electricity', 'water', 'wifi'] as const;
const FACILITY_CODES = new Set([
  'secure_parking',
  'garden',
  'laundry',
  'pool',
  'security',
  'shared_kitchen',
  'study_area',
  'communal_lounge',
  'backup_power',
  'wifi',
]);
const SPACE_FEATURE_CODES = new Set([
  'private_bathroom',
  'furnished',
  'bed',
  'desk',
  'wardrobe',
  'kitchenette',
  'balcony',
  'air_conditioning',
  'private_entrance',
]);

export type BillState = 'included' | 'excluded' | 'to_be_confirmed';
export type SharedLivingMediaScope = 'residence' | 'space';

function fail(code: ConstructorParameters<typeof TRPCError>[0]['code'], message: string): never {
  throw new TRPCError({ code, message });
}
async function database() {
  const db = await getDb();
  if (!db) fail('SERVICE_UNAVAILABLE', 'Shared Living storage is temporarily unavailable.');
  return db;
}

function makeSlug(value: string, suffix: string, max = 160) {
  const base = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max - suffix.length - 1);
  return `${base || 'shared-living'}-${suffix}`;
}

function mysqlDateTime(date: string, endOfDay = false) {
  return `${date} ${endOfDay ? '23:59:59' : '00:00:00'}`;
}

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function billSnapshot(value: unknown): Record<(typeof BILLS)[number], BillState> {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    BILLS.map(code => [
      code,
      raw[code] === 'included' || raw[code] === 'excluded' ? raw[code] : 'to_be_confirmed',
    ]),
  ) as Record<(typeof BILLS)[number], BillState>;
}

async function requireActiveAuthority(db: any, placeId: number, agentUserId: number) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const [authority] = await db
    .select({ id: slListingAuthorities.id, expiresAt: slListingAuthorities.expiresAt })
    .from(slListingAuthorities)
    .where(
      and(
        eq(slListingAuthorities.placeId, placeId),
        eq(slListingAuthorities.agentUserId, agentUserId),
        inArray(slListingAuthorities.status, [...ACTIVE_AUTHORITY_STATES]),
        lte(slListingAuthorities.effectiveAt, now),
        gt(slListingAuthorities.expiresAt, now),
      ),
    )
    .orderBy(desc(slListingAuthorities.expiresAt))
    .limit(1);
  if (!authority) fail('FORBIDDEN', 'An approved, current mandate is required for this residence.');
  return authority;
}

async function requireAgentDraftAccess(db: any, placeId: number, agentUserId: number) {
  const [residence] = await db
    .select({ id: slPlaces.id })
    .from(slPlaces)
    .where(eq(slPlaces.id, placeId))
    .limit(1);
  if (!residence) fail('NOT_FOUND', 'Residence not found.');
  const [authority] = await db
    .select({ id: slListingAuthorities.id, status: slListingAuthorities.status, expiresAt: slListingAuthorities.expiresAt })
    .from(slListingAuthorities)
    .where(
      and(
        eq(slListingAuthorities.placeId, placeId),
        eq(slListingAuthorities.agentUserId, agentUserId),
        inArray(slListingAuthorities.status, ['draft', 'pending_review', 'approved', 'rejected']),
        gt(slListingAuthorities.expiresAt, new Date().toISOString().slice(0, 19).replace('T', ' ')),
      ),
    )
    .orderBy(desc(slListingAuthorities.createdAt))
    .limit(1);
  if (!authority) fail('FORBIDDEN', 'You do not have a current mandate request for this residence.');
  return residence;
}

async function assertCanonicalPlace(db: any, canonicalPlaceId: string, publication: boolean) {
  const resolution = await executePlace(canonicalPlaceId, db);
  if (!resolution.ok) {
    fail('PRECONDITION_FAILED', `The selected canonical Place cannot be assigned (${resolution.reason}).`);
  }
  const [canonical] = await db
    .select({
      placeId: place.placeId,
      publicationEligible: place.publicationEligible,
      lifecycleStatus: place.lifecycleStatus,
    })
    .from(place)
    .innerJoin(
      placeName,
      and(
        eq(placeName.placeId, place.placeId),
        eq(placeName.nameRole, 'preferred_public'),
        eq(placeName.nameState, 'active'),
      ),
    )
    .where(eq(place.placeId, canonicalPlaceId))
    .limit(1);
  if (!canonical || canonical.lifecycleStatus !== 'active') {
    fail('PRECONDITION_FAILED', 'The selected canonical Place is not active.');
  }
  if (publication && canonical.publicationEligible !== 1) {
    fail('PRECONDITION_FAILED', 'The selected Place is not eligible for public listing publication.');
  }
}

export async function createResidenceDraft(
  agentUserId: number,
  input: {
    residenceName: string;
    addressLinePrivate: string;
    canonicalPlaceId: string;
    placeKind: 'house' | 'apartment' | 'townhouse' | 'student_residence' | 'other';
    description?: string;
    responsiblePartyRole: 'owner' | 'landlord' | 'operator';
    responsiblePartyName: string;
    responsiblePartyEmail: string;
    responsiblePartyPhone?: string;
    authorityEffectiveDate: string;
    authorityExpiryDate: string;
  },
) {
  const db = await database();
  await assertCanonicalPlace(db, input.canonicalPlaceId, false);
  if (input.authorityExpiryDate <= input.authorityEffectiveDate) {
    fail('BAD_REQUEST', 'The mandate expiry date must be after its effective date.');
  }
  return db.transaction(async (tx: any) => {
    const slug = makeSlug(input.residenceName, randomUUID().slice(0, 8));
    const [insert] = await tx.insert(slPlaces).values({
      slug,
      residenceName: input.residenceName.trim(),
      createdByUserId: agentUserId,
      addressLinePrivate: input.addressLinePrivate.trim(),
      canonicalPlaceId: input.canonicalPlaceId,
      geoPrecision: 'suburb',
      placeKind: input.placeKind,
      description: input.description?.trim() || null,
      publicationStatus: 'draft',
    });
    const placeId = Number(insert.insertId);
    const [partyInsert] = await tx.insert(slResponsibleParties).values({
      placeId,
      partyRole: input.responsiblePartyRole,
      displayName: input.responsiblePartyName.trim(),
      contactEmail: input.responsiblePartyEmail.trim().toLowerCase(),
      contactPhone: input.responsiblePartyPhone?.trim() || null,
      createdByUserId: agentUserId,
      // This is a claimed grantor; reviewer approval makes it current.
      isCurrent: 0,
    });
    const [authorityInsert] = await tx.insert(slListingAuthorities).values({
      placeId,
      agentUserId,
      responsiblePartyId: Number(partyInsert.insertId),
      status: 'draft',
      effectiveAt: mysqlDateTime(input.authorityEffectiveDate),
      expiresAt: mysqlDateTime(input.authorityExpiryDate, true),
      createdByUserId: agentUserId,
    });
    return {
      placeId,
      slug,
      authorityId: Number(authorityInsert.insertId),
      publicationStatus: 'draft' as const,
      authorityStatus: 'draft' as const,
    };
  });
}

export async function createMandateEvidenceUploadTarget(
  agentUserId: number,
  placeId: number,
  input: { fileName: string; contentType: string },
) {
  const db = await database();
  await requireAgentDraftAccess(db, placeId, agentUserId);
  const reservation = createSharedLivingEvidenceUploadReservation({
    placeId,
    userId: agentUserId,
    fileName: input.fileName,
    contentType: input.contentType,
  });
  if (getMediaStorageAdapter() === 'local') {
    const { buildLocalMediaUploadUrl } = await import('../_core/mediaStorage');
    return { url: buildLocalMediaUploadUrl(reservation.token), uploadToken: reservation.token };
  }
  return {
    url: await createSharedLivingEvidenceS3UploadUrl(reservation.payload),
    uploadToken: reservation.token,
  };
}

export async function attachMandateEvidence(
  agentUserId: number,
  authorityId: number,
  uploadToken: string,
) {
  const db = await database();
  const reservation = verifySharedLivingEvidenceUploadReservation(uploadToken, { userId: agentUserId });
  const [authority] = await db
    .select({ id: slListingAuthorities.id, placeId: slListingAuthorities.placeId })
    .from(slListingAuthorities)
    .where(and(eq(slListingAuthorities.id, authorityId), eq(slListingAuthorities.agentUserId, agentUserId)))
    .limit(1);
  if (!authority || Number(authority.placeId) !== reservation.placeId) {
    fail('FORBIDDEN', 'Mandate evidence does not belong to this agent and residence.');
  }
  let verified: { contentType: string | null; contentLength: number | null };
  if (getMediaStorageAdapter() === 's3') {
    const object = await inspectSharedLivingEvidenceS3Object(reservation);
    verified = { contentType: object.contentType, contentLength: object.contentLength };
  } else {
    verified = await assertUploadedMediaObject(reservation.key, reservation.contentType);
  }
  if (!verified.contentLength || verified.contentLength > 25 * 1024 * 1024) {
    fail('BAD_REQUEST', 'Uploaded mandate evidence is empty or exceeds 25 MB.');
  }
  const [result] = await db.insert(slListingAuthorityEvidence).values({
    authorityId,
    storageAdapter: getMediaStorageAdapter(),
    storageKey: reservation.key,
    originalFileName: reservation.fileName,
    mimeType: reservation.contentType,
    byteSize: verified.contentLength,
    uploadedByUserId: agentUserId,
  });
  return { evidenceId: Number(result.insertId), fileName: reservation.fileName };
}

export async function submitMandateForReview(agentUserId: number, authorityId: number) {
  const db = await database();
  return db.transaction(async (tx: any) => {
    const [authority] = await tx
      .select()
      .from(slListingAuthorities)
      .where(and(eq(slListingAuthorities.id, authorityId), eq(slListingAuthorities.agentUserId, agentUserId)))
      .limit(1)
      .for('update');
    if (!authority) fail('NOT_FOUND', 'Mandate request not found.');
    const [evidence] = await tx
      .select({ id: slListingAuthorityEvidence.id })
      .from(slListingAuthorityEvidence)
      .where(eq(slListingAuthorityEvidence.authorityId, authorityId))
      .limit(1);
    if (!evidence) fail('BAD_REQUEST', 'Upload signed or otherwise verifiable authorization before submission.');
    if (!['draft', 'rejected'].includes(authority.status)) {
      fail('CONFLICT', 'This mandate request cannot be submitted in its current state.');
    }
    await tx
      .update(slListingAuthorities)
      .set({ status: 'pending_review', reviewedByUserId: null, reviewedAt: null, reviewReason: null })
      .where(eq(slListingAuthorities.id, authorityId));
    await tx.insert(slListingAuthorityEvents).values({
      authorityId,
      eventType: 'submitted',
      actorUserId: agentUserId,
      previousStatus: authority.status,
      nextStatus: 'pending_review',
    });
    return { authorityId, status: 'pending_review' as const };
  });
}

/** Request authority over an existing, currently unrepresented residence. */
export async function requestResidenceAuthority(
  agentUserId: number,
  placeId: number,
  input: {
    responsiblePartyRole: 'owner' | 'landlord' | 'operator';
    responsiblePartyName: string;
    responsiblePartyEmail: string;
    responsiblePartyPhone?: string;
    authorityEffectiveDate: string;
    authorityExpiryDate: string;
  },
) {
  if (input.authorityExpiryDate <= input.authorityEffectiveDate) {
    fail('BAD_REQUEST', 'The mandate expiry date must be after its effective date.');
  }
  const db = await database();
  return db.transaction(async (tx: any) => {
    const [residence] = await tx.select({ id: slPlaces.id })
      .from(slPlaces).where(eq(slPlaces.id, placeId)).limit(1).for('update');
    if (!residence) fail('NOT_FOUND', 'Residence not found.');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [active] = await tx.select({ id: slListingAuthorities.id })
      .from(slListingAuthorities)
      .where(and(eq(slListingAuthorities.placeId, placeId), eq(slListingAuthorities.status, 'approved'), lte(slListingAuthorities.effectiveAt, now), gt(slListingAuthorities.expiresAt, now)))
      .limit(1);
    if (active) fail('CONFLICT', 'This residence already has a current authorized lister.');
    const [pending] = await tx.select({ id: slListingAuthorities.id })
      .from(slListingAuthorities)
      .where(and(eq(slListingAuthorities.placeId, placeId), eq(slListingAuthorities.status, 'pending_review'), gt(slListingAuthorities.expiresAt, now)))
      .limit(1);
    if (pending) fail('CONFLICT', 'A residence mandate is already awaiting review.');
    const [partyInsert] = await tx.insert(slResponsibleParties).values({
      placeId,
      partyRole: input.responsiblePartyRole,
      displayName: input.responsiblePartyName.trim(),
      contactEmail: input.responsiblePartyEmail.trim().toLowerCase(),
      contactPhone: input.responsiblePartyPhone?.trim() || null,
      createdByUserId: agentUserId,
      isCurrent: 0,
    });
    const [authorityInsert] = await tx.insert(slListingAuthorities).values({
      placeId,
      agentUserId,
      responsiblePartyId: Number(partyInsert.insertId),
      status: 'draft',
      effectiveAt: mysqlDateTime(input.authorityEffectiveDate),
      expiresAt: mysqlDateTime(input.authorityExpiryDate, true),
      createdByUserId: agentUserId,
    });
    // Explicitly hold the existing inventory while the replacement mandate
    // is reviewed. The former ownership/party records remain untouched.
    await tx.update(slPlaces).set({ publicationStatus: 'held' }).where(eq(slPlaces.id, placeId));
    await tx.update(slSpaces).set({ publicationStatus: 'held' }).where(eq(slSpaces.placeId, placeId));
    return { placeId, authorityId: Number(authorityInsert.insertId), authorityStatus: 'draft' as const, publicationStatus: 'held' as const };
  });
}

/** Small, safe takeover list: only previously authorized residences with no
 * active or pending mandate. It never returns a private address or contact. */
export async function listRequestableResidences() {
  const db = await database();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const [history, active, pending] = await Promise.all([
    db.select({ id: slPlaces.id, slug: slPlaces.slug, residenceName: slPlaces.residenceName, placeKind: slPlaces.placeKind, canonicalPlaceId: slPlaces.canonicalPlaceId, status: slListingAuthorities.status, authorityId: slListingAuthorities.id })
      .from(slPlaces).innerJoin(slListingAuthorities, eq(slListingAuthorities.placeId, slPlaces.id))
      .where(inArray(slListingAuthorities.status, ['approved', 'revoked', 'expired', 'superseded']))
      .orderBy(desc(slPlaces.updatedAt)).limit(200),
    db.select({ placeId: slListingAuthorities.placeId }).from(slListingAuthorities)
      .where(and(eq(slListingAuthorities.status, 'approved'), lte(slListingAuthorities.effectiveAt, now), gt(slListingAuthorities.expiresAt, now))),
    db.select({ placeId: slListingAuthorities.placeId }).from(slListingAuthorities)
      .where(and(eq(slListingAuthorities.status, 'pending_review'), gt(slListingAuthorities.expiresAt, now))),
  ]);
  const unavailable = new Set([...active, ...pending].map(item => Number(item.placeId)));
  const candidates = new Map<number, (typeof history)[number]>();
  for (const row of history) if (!unavailable.has(Number(row.id))) candidates.set(Number(row.id), row);
  const result: Array<{ id: number; slug: string; residenceName: string; placeKind: string; publicLocation: string }> = [];
  for (const row of [...candidates.values()].slice(0, 50)) {
    const [location] = await db.select({ label: placeName.name }).from(place)
      .innerJoin(placeName, and(eq(placeName.placeId, place.placeId), eq(placeName.nameRole, 'preferred_public'), eq(placeName.nameState, 'active')))
      .where(eq(place.placeId, row.canonicalPlaceId)).limit(1);
    if (location?.label) result.push({ id: row.id, slug: row.slug, residenceName: row.residenceName, placeKind: row.placeKind, publicLocation: location.label });
  }
  return result;
}

export async function addSpaceDraft(
  agentUserId: number,
  input: {
    placeId: number;
    label: string;
    description: string;
    accommodationType: string;
    marketTag: string;
    rentAmountMinor: number;
    rentUnknown: boolean;
    rentBasis: 'per_space' | 'per_person';
    availabilityStatus: 'available' | 'occupied' | 'unavailable';
    availableFrom?: string;
    occupancyCount?: number;
    furnishedState: 'furnished' | 'unfurnished' | 'partial' | 'unknown';
    bathroomAccess: 'own' | 'shared' | 'unknown';
    parkingBays?: number;
    bills: Record<(typeof BILLS)[number], BillState>;
    facilities: string[];
  },
) {
  const db = await database();
  await requireAgentDraftAccess(db, input.placeId, agentUserId);
  await requireActiveAuthority(db, input.placeId, agentUserId);
  if (input.facilities.some(code => !SPACE_FEATURE_CODES.has(code))) fail('BAD_REQUEST', 'Unsupported space facility.');
  return db.transaction(async (tx: any) => {
    const slug = makeSlug(input.label, randomUUID().slice(0, 8), 180);
    const [result] = await tx.insert(slSpaces).values({
      placeId: input.placeId,
      slug,
      label: input.label.trim(),
      description: input.description.trim(),
      accommodationType: input.accommodationType,
      marketTag: input.marketTag,
      availabilityStatus: input.availabilityStatus,
      publicationStatus: 'draft',
      occupancyCount: input.occupancyCount ?? null,
      furnishedState: input.furnishedState,
      bathroomAccess: input.bathroomAccess,
      parkingBays: input.parkingBays ?? null,
      legacyStatus: 'hidden',
    });
    const spaceId = Number(result.insertId);
    await tx.insert(slSpaceAvailability).values({
      spaceId,
      availableFrom: input.availableFrom || null,
      rentAmountMinor: input.rentUnknown ? 0 : input.rentAmountMinor,
      rentUnknown: input.rentUnknown ? 1 : 0,
      rentBasis: input.rentBasis,
      billsIncludedJson: billSnapshot(input.bills),
    });
    for (const code of input.facilities) {
      await tx.insert(slSpaceSpecifications).values({
        spaceId,
        specificationCode: code,
        valueState: 'known',
        booleanValue: 1,
      });
    }
    return { spaceId, slug, publicationStatus: 'draft' as const };
  });
}

export async function updateSpaceDraft(
  agentUserId: number,
  input: {
    spaceId: number;
    label?: string;
    description?: string;
    accommodationType?: (typeof SHARED_LIVING_ACCOMMODATION_TYPES)[number];
    marketTag?: (typeof SHARED_LIVING_MARKET_TAGS)[number];
    rentAmountMinor?: number;
    rentUnknown?: boolean;
    rentBasis?: 'per_space' | 'per_person';
    availabilityStatus?: 'available' | 'occupied' | 'unavailable';
    availableFrom?: string | null;
    occupancyCount?: number | null;
    furnishedState?: 'furnished' | 'unfurnished' | 'partial' | 'unknown';
    bathroomAccess?: 'own' | 'shared' | 'unknown';
    parkingBays?: number | null;
    bills?: Record<(typeof BILLS)[number], BillState>;
    facilities?: string[];
  },
) {
  const db = await database();
  const [space] = await db.select().from(slSpaces).where(eq(slSpaces.id, input.spaceId)).limit(1);
  if (!space) fail('NOT_FOUND', 'Accommodation space not found.');
  await requireAgentDraftAccess(db, Number(space.placeId), agentUserId);
  const contentChange =
    input.label !== undefined || input.description !== undefined || input.accommodationType !== undefined || input.marketTag !== undefined || input.rentAmountMinor !== undefined ||
    input.rentUnknown !== undefined || input.rentBasis !== undefined || input.facilities !== undefined ||
    input.furnishedState !== undefined || input.bathroomAccess !== undefined || input.parkingBays !== undefined || input.bills !== undefined;
  if (input.facilities?.some(code => !SPACE_FEATURE_CODES.has(code))) fail('BAD_REQUEST', 'Unsupported space facility.');
  return db.transaction(async (tx: any) => {
    const patch: Record<string, unknown> = {};
    if (input.label !== undefined) patch.label = input.label.trim();
    if (input.description !== undefined) patch.description = input.description.trim();
    if (input.accommodationType !== undefined) patch.accommodationType = input.accommodationType;
    if (input.marketTag !== undefined) patch.marketTag = input.marketTag;
    if (input.availabilityStatus !== undefined) patch.availabilityStatus = input.availabilityStatus;
    if (input.occupancyCount !== undefined) patch.occupancyCount = input.occupancyCount;
    if (input.furnishedState !== undefined) patch.furnishedState = input.furnishedState;
    if (input.bathroomAccess !== undefined) patch.bathroomAccess = input.bathroomAccess;
    if (input.parkingBays !== undefined) patch.parkingBays = input.parkingBays;
    const requiresReview = contentChange && ['published', 'approved', 'rejected'].includes(space.publicationStatus);
    if (requiresReview) {
      patch.publicationStatus = 'pending_review';
      await tx.insert(slModerationQueue).values({
        placeId: space.placeId,
        subjectType: 'space',
        spaceId: space.id,
        action: 'submit',
      });
    }
    await tx.update(slSpaces).set(patch).where(eq(slSpaces.id, space.id));
    if (
      input.rentAmountMinor !== undefined || input.rentUnknown !== undefined ||
      input.rentBasis !== undefined || input.availableFrom !== undefined || input.bills !== undefined
    ) {
      await tx.update(slSpaceAvailability).set({
        ...(input.rentAmountMinor === undefined ? {} : { rentAmountMinor: input.rentUnknown ? 0 : input.rentAmountMinor }),
        ...(input.rentUnknown === undefined ? {} : { rentUnknown: input.rentUnknown ? 1 : 0 }),
        ...(input.rentBasis === undefined ? {} : { rentBasis: input.rentBasis }),
        ...(input.availableFrom === undefined ? {} : { availableFrom: input.availableFrom || null }),
        ...(input.bills === undefined ? {} : { billsIncludedJson: billSnapshot(input.bills) }),
      }).where(eq(slSpaceAvailability.spaceId, space.id));
    }
    if (input.facilities) {
      for (const code of input.facilities) {
        await tx.insert(slSpaceSpecifications).values({
          spaceId: space.id,
          specificationCode: code,
          valueState: 'known',
          booleanValue: 1,
        }).onDuplicateKeyUpdate({ set: { valueState: 'known', booleanValue: 1 } });
      }
      const current = await tx.select({ id: slSpaceSpecifications.id, code: slSpaceSpecifications.specificationCode })
        .from(slSpaceSpecifications).where(eq(slSpaceSpecifications.spaceId, space.id));
      for (const row of current) if (!input.facilities.includes(row.code)) {
        await tx.update(slSpaceSpecifications).set({ valueState: 'unknown', booleanValue: null }).where(eq(slSpaceSpecifications.id, row.id));
      }
    }
    return { ok: true, publicationStatus: requiresReview ? 'pending_review' : space.publicationStatus };
  });
}

export async function attachListingMedia(
  agentUserId: number,
  input: { scope: SharedLivingMediaScope; entityId: number; key: string; contentType: string; caption?: string },
) {
  const db = await database();
  if (!input.key.startsWith(`properties/draft-${agentUserId}/`)) {
    fail('FORBIDDEN', 'Photo must be uploaded through this agent account.');
  }
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(input.contentType)) fail('BAD_REQUEST', 'Use a supported image format.');
  const verified = await assertUploadedMediaObject(input.key, input.contentType);
  if (!verified.contentLength || verified.contentLength > 15 * 1024 * 1024) fail('BAD_REQUEST', 'Photo is empty or larger than 15 MB.');
  if (input.scope === 'residence') {
    await requireAgentDraftAccess(db, input.entityId, agentUserId);
    return db.transaction(async (tx: any) => {
      const [result] = await tx.insert(slPlaceMedia).values({
        placeId: input.entityId,
        storageKey: input.key,
        uploadedByUserId: agentUserId,
        contentType: input.contentType,
        byteSize: verified.contentLength,
        caption: input.caption?.trim() || null,
        displayOrder: 0,
        reviewStatus: 'pending_review',
      });
      const [residence] = await tx.select({ status: slPlaces.publicationStatus }).from(slPlaces).where(eq(slPlaces.id, input.entityId)).limit(1).for('update');
      if (residence && ['published', 'approved', 'rejected'].includes(residence.status)) {
        await tx.update(slPlaces).set({ publicationStatus: 'pending_review' }).where(eq(slPlaces.id, input.entityId));
        await tx.insert(slModerationQueue).values({ placeId: input.entityId, subjectType: 'residence', action: 'submit' });
      }
      return { mediaId: Number(result.insertId), reviewStatus: 'pending_review' as const };
    });
  }
  const [space] = await db.select({ id: slSpaces.id, placeId: slSpaces.placeId }).from(slSpaces).where(eq(slSpaces.id, input.entityId)).limit(1);
  if (!space) fail('NOT_FOUND', 'Accommodation space not found.');
  await requireAgentDraftAccess(db, Number(space.placeId), agentUserId);
  return db.transaction(async (tx: any) => {
    const [result] = await tx.insert(slSpaceMedia).values({
      spaceId: input.entityId,
      storageKey: input.key,
      uploadedByUserId: agentUserId,
      contentType: input.contentType,
      byteSize: verified.contentLength,
      caption: input.caption?.trim() || null,
      displayOrder: 0,
      isCover: 1,
      reviewStatus: 'pending_review',
    });
    const [current] = await tx.select({ status: slSpaces.publicationStatus }).from(slSpaces).where(eq(slSpaces.id, input.entityId)).limit(1).for('update');
    if (current && ['published', 'approved', 'rejected'].includes(current.status)) {
      await tx.update(slSpaces).set({ publicationStatus: 'pending_review' }).where(eq(slSpaces.id, input.entityId));
      await tx.insert(slModerationQueue).values({ placeId: Number(space.placeId), subjectType: 'space', spaceId: input.entityId, action: 'submit' });
    }
    return { mediaId: Number(result.insertId), reviewStatus: 'pending_review' as const };
  });
}

export async function submitResidenceForReview(agentUserId: number, placeId: number) {
  const db = await database();
  await requireActiveAuthority(db, placeId, agentUserId);
  return db.transaction(async (tx: any) => {
    const [residence] = await tx.select().from(slPlaces).where(eq(slPlaces.id, placeId)).limit(1).for('update');
    if (!residence) fail('NOT_FOUND', 'Residence not found.');
    await assertCanonicalPlace(tx, residence.canonicalPlaceId, true);
    if (!residence.residenceName.trim() || !residence.addressLinePrivate.trim()) fail('BAD_REQUEST', 'Residence identity and private address are required.');
    const allSpaces = await tx.select().from(slSpaces).where(eq(slSpaces.placeId, placeId));
    if (!allSpaces.length) fail('BAD_REQUEST', 'Add at least one accommodation space before submission.');
    const spaces = allSpaces.filter((space: any) => ['draft', 'rejected', 'held'].includes(space.publicationStatus));
    const needsResidenceReview = ['draft', 'rejected', 'held'].includes(residence.publicationStatus);
    if (!spaces.length && !needsResidenceReview) fail('CONFLICT', 'There are no new residence or space changes to submit.');
    for (const space of spaces) {
      if (!space.label.trim() || String(space.description || '').trim().length < 20) {
        fail('BAD_REQUEST', `Add a useful description of at least 20 characters for ${space.label || 'each space'}.`);
      }
      const [availability] = await tx.select().from(slSpaceAvailability).where(eq(slSpaceAvailability.spaceId, space.id)).limit(1);
      if (!availability || (!availability.rentUnknown && availability.rentAmountMinor <= 0)) {
        fail('BAD_REQUEST', `Add a monthly rent or mark it as to be confirmed for ${space.label}.`);
      }
      const [media] = await tx.select({ id: slSpaceMedia.id }).from(slSpaceMedia).where(eq(slSpaceMedia.spaceId, space.id)).limit(1);
      if (!media) fail('BAD_REQUEST', `Upload at least one photo for ${space.label}.`);
    }
    if (needsResidenceReview) {
      await tx.update(slPlaces).set({ publicationStatus: 'pending_review' }).where(eq(slPlaces.id, placeId));
      await tx.insert(slModerationQueue).values({ placeId, subjectType: 'residence', action: 'submit' });
    }
    for (const space of spaces) {
      await tx.update(slSpaces).set({ publicationStatus: 'pending_review' }).where(eq(slSpaces.id, space.id));
      await tx.insert(slModerationQueue).values({ placeId, subjectType: 'space', spaceId: space.id, action: 'submit' });
    }
    return { placeId, publicationStatus: needsResidenceReview ? 'pending_review' as const : residence.publicationStatus, spacesSubmitted: spaces.length };
  });
}

export async function listAgentResidences(agentUserId: number) {
  const db = await database();
  const rows = await db.select({
    id: slPlaces.id,
    slug: slPlaces.slug,
    residenceName: slPlaces.residenceName,
    publicationStatus: slPlaces.publicationStatus,
    canonicalPlaceId: slPlaces.canonicalPlaceId,
    createdAt: slPlaces.createdAt,
    authorityStatus: slListingAuthorities.status,
    authorityExpiry: slListingAuthorities.expiresAt,
    responsiblePartyName: slResponsibleParties.displayName,
  }).from(slPlaces)
    .innerJoin(slListingAuthorities, and(eq(slListingAuthorities.placeId, slPlaces.id), eq(slListingAuthorities.agentUserId, agentUserId)))
    .leftJoin(slResponsibleParties, eq(slResponsibleParties.id, slListingAuthorities.responsiblePartyId))
    .orderBy(desc(slListingAuthorities.createdAt), desc(slPlaces.updatedAt));
  const places: any[] = [];
  for (const row of rows) {
    const spaces = await db.select({
      id: slSpaces.id,
      slug: slSpaces.slug,
      label: slSpaces.label,
      accommodationType: slSpaces.accommodationType,
      marketTag: slSpaces.marketTag,
      publicationStatus: slSpaces.publicationStatus,
      availabilityStatus: slSpaces.availabilityStatus,
    }).from(slSpaces).where(eq(slSpaces.placeId, row.id)).orderBy(asc(slSpaces.sortOrder), asc(slSpaces.id));
    places.push({ ...row, spaces });
  }
  return places;
}

async function mediaForPublic(db: any, scope: SharedLivingMediaScope, entityId: number) {
  const rows = scope === 'residence'
    ? await db.select({ key: slPlaceMedia.storageKey, caption: slPlaceMedia.caption, isCover: slPlaceMedia.isCover, displayOrder: slPlaceMedia.displayOrder })
        .from(slPlaceMedia).where(and(eq(slPlaceMedia.placeId, entityId), eq(slPlaceMedia.reviewStatus, 'approved'))).orderBy(desc(slPlaceMedia.isCover), asc(slPlaceMedia.displayOrder))
    : await db.select({ key: slSpaceMedia.storageKey, caption: slSpaceMedia.caption, isCover: slSpaceMedia.isCover, displayOrder: slSpaceMedia.displayOrder })
        .from(slSpaceMedia).where(and(eq(slSpaceMedia.spaceId, entityId), eq(slSpaceMedia.reviewStatus, 'approved'))).orderBy(desc(slSpaceMedia.isCover), asc(slSpaceMedia.displayOrder));
  return rows.map((row: any) => ({ url: resolveMediaDeliveryUrl(row.key), caption: row.caption || null, isCover: Boolean(row.isCover) })).filter((item: any) => item.url);
}

function publicEligibilityWhere() {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return and(
    eq(slPlaces.publicationStatus, 'published'),
    eq(slSpaces.publicationStatus, 'published'),
    eq(slSpaces.availabilityStatus, 'available'),
    eq(place.publicationEligible, 1),
    eq(place.searchEligible, 1),
    eq(place.lifecycleStatus, 'active'),
    eq(place.verificationStatus, 'verified'),
    eq(placeName.nameRole, 'preferred_public'),
    eq(placeName.nameState, 'active'),
    eq(slListingAuthorities.status, 'approved'),
    lte(slListingAuthorities.effectiveAt, now),
    gt(slListingAuthorities.expiresAt, now),
  );
}

export async function searchPublishedSpaces(input: {
  marketTag?: (typeof SHARED_LIVING_MARKET_TAGS)[number];
  accommodationTypes?: Array<(typeof SHARED_LIVING_ACCOMMODATION_TYPES)[number]>;
  minPrice?: number;
  maxPrice?: number;
  billsElectricity?: boolean;
  billsWifi?: boolean;
  furnished?: 'furnished' | 'partial' | 'any';
  bathroom?: 'own' | 'shared' | 'any';
  availableFrom?: string;
  canonicalPlaceId?: string;
  canonicalPlaceIds?: string[];
  page?: number;
}) {
  const db = await database();
  const filters: any[] = [publicEligibilityWhere()];
  if (input.marketTag) filters.push(eq(slSpaces.marketTag, input.marketTag));
  if (input.accommodationTypes?.length) filters.push(inArray(slSpaces.accommodationType, input.accommodationTypes));
  if (input.canonicalPlaceId) filters.push(eq(slPlaces.canonicalPlaceId, input.canonicalPlaceId));
  else if (input.canonicalPlaceIds?.length) filters.push(inArray(slPlaces.canonicalPlaceId, input.canonicalPlaceIds));
  if (input.minPrice !== undefined) filters.push(and(eq(slSpaceAvailability.rentUnknown, 0), gte(slSpaceAvailability.rentAmountMinor, Math.round(input.minPrice * 100))));
  if (input.maxPrice !== undefined) filters.push(and(eq(slSpaceAvailability.rentUnknown, 0), lte(slSpaceAvailability.rentAmountMinor, Math.round(input.maxPrice * 100))));
  if (input.furnished && input.furnished !== 'any') filters.push(eq(slSpaces.furnishedState, input.furnished));
  if (input.bathroom && input.bathroom !== 'any') filters.push(eq(slSpaces.bathroomAccess, input.bathroom));
  if (input.availableFrom) filters.push(or(isNull(slSpaceAvailability.availableFrom), lte(slSpaceAvailability.availableFrom, input.availableFrom)));
  if (input.billsElectricity !== undefined) filters.push(sql`JSON_UNQUOTE(JSON_EXTRACT(${slSpaceAvailability.billsIncludedJson}, '$.electricity')) = ${input.billsElectricity ? 'included' : 'excluded'}`);
  if (input.billsWifi !== undefined) filters.push(sql`JSON_UNQUOTE(JSON_EXTRACT(${slSpaceAvailability.billsIncludedJson}, '$.wifi')) = ${input.billsWifi ? 'included' : 'excluded'}`);
  const page = input.page ?? 0;
  const rows = await db.select({
    placeId: slPlaces.id,
    placeSlug: slPlaces.slug,
    residenceName: slPlaces.residenceName,
    placeKind: slPlaces.placeKind,
    canonicalPlaceId: slPlaces.canonicalPlaceId,
    publicLocation: placeName.name,
    spaceId: slSpaces.id,
    slug: slSpaces.slug,
    label: slSpaces.label,
    description: slSpaces.description,
    accommodationType: slSpaces.accommodationType,
    marketTag: slSpaces.marketTag,
    rentAmountMinor: slSpaceAvailability.rentAmountMinor,
    rentUnknown: slSpaceAvailability.rentUnknown,
    rentBasis: slSpaceAvailability.rentBasis,
    availableFrom: slSpaceAvailability.availableFrom,
    availabilityStatus: slSpaces.availabilityStatus,
    furnishedState: slSpaces.furnishedState,
    bathroomAccess: slSpaces.bathroomAccess,
    occupancyCount: slSpaces.occupancyCount,
  }).from(slSpaces)
    .innerJoin(slPlaces, eq(slPlaces.id, slSpaces.placeId))
    .innerJoin(slSpaceAvailability, eq(slSpaceAvailability.spaceId, slSpaces.id))
    .innerJoin(place, eq(place.placeId, slPlaces.canonicalPlaceId))
    .innerJoin(placeName, and(eq(placeName.placeId, place.placeId), eq(placeName.nameRole, 'preferred_public'), eq(placeName.nameState, 'active')))
    .innerJoin(slListingAuthorities, and(eq(slListingAuthorities.placeId, slPlaces.id), eq(slListingAuthorities.status, 'approved'), lte(slListingAuthorities.effectiveAt, new Date().toISOString().slice(0, 19).replace('T', ' ')), gt(slListingAuthorities.expiresAt, new Date().toISOString().slice(0, 19).replace('T', ' '))))
    .where(and(...filters))
    .orderBy(desc(slSpaces.updatedAt), desc(slSpaces.id))
    .limit(PUBLIC_PAGE_SIZE + 1)
    .offset(page * PUBLIC_PAGE_SIZE);
  const hasMore = rows.length > PUBLIC_PAGE_SIZE;
  const items = await Promise.all(rows.slice(0, PUBLIC_PAGE_SIZE).map(async row => {
    const images = await mediaForPublic(db, 'space', row.spaceId);
    return {
      id: row.spaceId,
      placeId: row.placeId,
      slug: row.slug,
      placeSlug: row.placeSlug,
      residenceName: row.residenceName,
      label: row.label,
      description: row.description || '',
      accommodationType: row.accommodationType,
      marketTag: row.marketTag,
      rentAmountMinor: asNumber(row.rentAmountMinor),
      rentUnknown: Boolean(row.rentUnknown),
      rentBasis: row.rentBasis,
      availableFrom: row.availableFrom,
      availabilityStatus: row.availabilityStatus,
      furnishedState: row.furnishedState,
      bathroomAccess: row.bathroomAccess,
      occupancyCount: row.occupancyCount,
      locationLabel: row.publicLocation,
      images,
    };
  }));
  return { items, total: null, page, pageSize: PUBLIC_PAGE_SIZE, hasMore, locationState: input.canonicalPlaceId || input.canonicalPlaceIds ? 'selected' as const : 'none' as const };
}

export async function getPublishedSpaceDetail(slug: string) {
  const db = await database();
  const [row] = await db.select({
    placeId: slPlaces.id,
    placeSlug: slPlaces.slug,
    residenceName: slPlaces.residenceName,
    residenceDescription: slPlaces.description,
    placeKind: slPlaces.placeKind,
    publicLocation: placeName.name,
    spaceId: slSpaces.id,
    slug: slSpaces.slug,
    label: slSpaces.label,
    description: slSpaces.description,
    accommodationType: slSpaces.accommodationType,
    marketTag: slSpaces.marketTag,
    availabilityStatus: slSpaces.availabilityStatus,
    occupancyCount: slSpaces.occupancyCount,
    furnishedState: slSpaces.furnishedState,
    bathroomAccess: slSpaces.bathroomAccess,
    parkingBays: slSpaces.parkingBays,
    rentAmountMinor: slSpaceAvailability.rentAmountMinor,
    rentUnknown: slSpaceAvailability.rentUnknown,
    rentBasis: slSpaceAvailability.rentBasis,
    availableFrom: slSpaceAvailability.availableFrom,
    billsIncludedJson: slSpaceAvailability.billsIncludedJson,
  }).from(slSpaces)
    .innerJoin(slPlaces, eq(slPlaces.id, slSpaces.placeId))
    .innerJoin(slSpaceAvailability, eq(slSpaceAvailability.spaceId, slSpaces.id))
    .innerJoin(place, eq(place.placeId, slPlaces.canonicalPlaceId))
    .innerJoin(placeName, and(eq(placeName.placeId, place.placeId), eq(placeName.nameRole, 'preferred_public'), eq(placeName.nameState, 'active')))
    .innerJoin(slListingAuthorities, and(eq(slListingAuthorities.placeId, slPlaces.id), eq(slListingAuthorities.status, 'approved'), lte(slListingAuthorities.effectiveAt, new Date().toISOString().slice(0, 19).replace('T', ' ')), gt(slListingAuthorities.expiresAt, new Date().toISOString().slice(0, 19).replace('T', ' '))))
    .where(and(eq(slSpaces.slug, slug), publicEligibilityWhere()))
    .limit(1);
  if (!row) return null;
  const [spaceFeatures, residenceFeatures] = await Promise.all([
    db.select({ code: slSpaceSpecifications.specificationCode }).from(slSpaceSpecifications)
      .where(and(eq(slSpaceSpecifications.spaceId, row.spaceId), eq(slSpaceSpecifications.valueState, 'known'), eq(slSpaceSpecifications.booleanValue, 1))),
    db.select({ code: slPlaceSpecifications.specificationCode }).from(slPlaceSpecifications)
      .where(and(eq(slPlaceSpecifications.placeId, row.placeId), eq(slPlaceSpecifications.valueState, 'known'), eq(slPlaceSpecifications.booleanValue, 1))),
  ]);
  return {
    id: row.spaceId,
    placeId: row.placeId,
    slug: row.slug,
    placeSlug: row.placeSlug,
    residenceName: row.residenceName,
    residenceDescription: row.residenceDescription || '',
    placeKind: row.placeKind,
    label: row.label,
    description: row.description || '',
    accommodationType: row.accommodationType,
    marketTag: row.marketTag,
    availabilityStatus: row.availabilityStatus,
    occupancyCount: row.occupancyCount,
    furnishedState: row.furnishedState,
    bathroomAccess: row.bathroomAccess,
    parkingBays: row.parkingBays,
    rentAmountMinor: asNumber(row.rentAmountMinor),
    rentUnknown: Boolean(row.rentUnknown),
    rentBasis: row.rentBasis,
    availableFrom: row.availableFrom,
    bills: billSnapshot(row.billsIncludedJson),
    spaceFacilities: spaceFeatures.map(item => item.code),
    sharedFacilities: residenceFeatures.map(item => item.code),
    locationLabel: row.publicLocation,
    images: await mediaForPublic(db, 'space', row.spaceId),
    residenceImages: await mediaForPublic(db, 'residence', row.placeId),
  };
}

export async function reviewAuthority(input: { reviewerUserId: number; authorityId: number; decision: 'approve' | 'reject'; reason?: string }) {
  const db = await database();
  return db.transaction(async (tx: any) => {
    const [authority] = await tx.select().from(slListingAuthorities).where(eq(slListingAuthorities.id, input.authorityId)).limit(1).for('update');
    if (!authority || authority.status !== 'pending_review') fail('CONFLICT', 'Mandate is not awaiting review.');
    const next = input.decision === 'approve' ? 'approved' : 'rejected';
    if (input.decision === 'approve') {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      if (authority.effectiveAt > now || authority.expiresAt <= now) {
        fail('PRECONDITION_FAILED', 'The mandate must be effective now and not expired before approval.');
      }
      const [evidence] = await tx.select({ id: slListingAuthorityEvidence.id })
        .from(slListingAuthorityEvidence).where(eq(slListingAuthorityEvidence.authorityId, authority.id)).limit(1);
      if (!evidence) fail('PRECONDITION_FAILED', 'Independent approval requires attached mandate evidence.');
      const prior = await tx.select({ id: slListingAuthorities.id, status: slListingAuthorities.status })
        .from(slListingAuthorities)
        .where(and(eq(slListingAuthorities.placeId, authority.placeId), eq(slListingAuthorities.status, 'approved'), ne(slListingAuthorities.id, authority.id)));
      for (const old of prior) {
        await tx.update(slListingAuthorities).set({ status: 'superseded' }).where(eq(slListingAuthorities.id, old.id));
        await tx.insert(slListingAuthorityEvents).values({ authorityId: old.id, eventType: 'superseded', actorUserId: input.reviewerUserId, previousStatus: old.status, nextStatus: 'superseded', reason: 'Superseded by a newly approved residence mandate.' });
      }
      await tx.update(slResponsibleParties).set({ isCurrent: 0 }).where(eq(slResponsibleParties.placeId, authority.placeId));
      await tx.update(slResponsibleParties).set({ isCurrent: 1 }).where(eq(slResponsibleParties.id, authority.responsiblePartyId));
    }
    await tx.update(slListingAuthorities).set({ status: next, reviewedByUserId: input.reviewerUserId, reviewedAt: new Date().toISOString().slice(0, 19).replace('T', ' '), reviewReason: input.reason?.trim() || null }).where(eq(slListingAuthorities.id, input.authorityId));
    await tx.insert(slListingAuthorityEvents).values({ authorityId: input.authorityId, eventType: next, actorUserId: input.reviewerUserId, previousStatus: authority.status, nextStatus: next, reason: input.reason?.trim() || null });
    return { authorityId: input.authorityId, status: next };
  });
}

export async function revokeAuthority(input: { actorUserId: number; authorityId: number; reason: string }) {
  const db = await database();
  return db.transaction(async (tx: any) => {
    const [authority] = await tx.select().from(slListingAuthorities).where(eq(slListingAuthorities.id, input.authorityId)).limit(1).for('update');
    if (!authority || !['approved', 'pending_review'].includes(authority.status)) fail('CONFLICT', 'This mandate cannot be revoked in its current state.');
    await tx.update(slListingAuthorities).set({ status: 'revoked', revokedByUserId: input.actorUserId, revokedAt: new Date().toISOString().slice(0, 19).replace('T', ' '), revocationReason: input.reason.trim() }).where(eq(slListingAuthorities.id, input.authorityId));
    await tx.update(slPlaces).set({ publicationStatus: 'held' }).where(eq(slPlaces.id, authority.placeId));
    await tx.update(slSpaces).set({ publicationStatus: 'held' }).where(eq(slSpaces.placeId, authority.placeId));
    await tx.insert(slListingAuthorityEvents).values({ authorityId: input.authorityId, eventType: 'revoked', actorUserId: input.actorUserId, previousStatus: authority.status, nextStatus: 'revoked', reason: input.reason.trim() });
    return { authorityId: input.authorityId, status: 'revoked' as const, placeId: authority.placeId };
  });
}

export async function moderationQueue() {
  const db = await database();
  const [authorities, listings] = await Promise.all([
    db.select({ authorityId: slListingAuthorities.id, placeId: slPlaces.id, residenceName: slPlaces.residenceName, agentUserId: slListingAuthorities.agentUserId, status: slListingAuthorities.status, effectiveAt: slListingAuthorities.effectiveAt, expiresAt: slListingAuthorities.expiresAt, grantor: slResponsibleParties.displayName, grantorRole: slResponsibleParties.partyRole, createdAt: slListingAuthorities.createdAt })
      .from(slListingAuthorities).innerJoin(slPlaces, eq(slPlaces.id, slListingAuthorities.placeId)).innerJoin(slResponsibleParties, eq(slResponsibleParties.id, slListingAuthorities.responsiblePartyId)).where(eq(slListingAuthorities.status, 'pending_review')).orderBy(asc(slListingAuthorities.createdAt)),
    db.select({ queueId: slModerationQueue.id, subjectType: slModerationQueue.subjectType, spaceId: slModerationQueue.spaceId, placeId: slPlaces.id, placeSlug: slPlaces.slug, residenceName: slPlaces.residenceName, residenceStatus: slPlaces.publicationStatus, spaceLabel: slSpaces.label, spaceStatus: slSpaces.publicationStatus, action: slModerationQueue.action, createdAt: slModerationQueue.createdAt })
      .from(slModerationQueue).innerJoin(slPlaces, eq(slPlaces.id, slModerationQueue.placeId)).leftJoin(slSpaces, eq(slSpaces.id, slModerationQueue.spaceId)).where(eq(slModerationQueue.action, 'submit')).orderBy(asc(slModerationQueue.createdAt)),
  ]);
  const authoritiesWithEvidence = await Promise.all(authorities.map(async authority => {
    const evidence = await db.select({ id: slListingAuthorityEvidence.id, fileName: slListingAuthorityEvidence.originalFileName, mimeType: slListingAuthorityEvidence.mimeType, byteSize: slListingAuthorityEvidence.byteSize })
      .from(slListingAuthorityEvidence).where(eq(slListingAuthorityEvidence.authorityId, authority.authorityId)).orderBy(asc(slListingAuthorityEvidence.createdAt));
    return { ...authority, evidence };
  }));
  const current = new Map<string, (typeof listings)[number]>();
  for (const row of listings) {
    const pending = row.subjectType === 'residence'
      ? row.residenceStatus === 'pending_review'
      : row.spaceStatus === 'pending_review';
    if (!pending) continue;
    const key = `${row.subjectType}:${row.placeId}:${row.spaceId ?? ''}`;
    current.set(key, row);
  }
  return { authorities: authoritiesWithEvidence, listings: [...current.values()] };
}

/** Authorized-reviewer detail projection; never called from a public route. */
export async function moderationReviewDetail(input: { placeId: number; subjectType: 'residence' | 'space'; spaceId?: number }) {
  const db = await database();
  const [residence] = await db.select({
    id: slPlaces.id,
    slug: slPlaces.slug,
    residenceName: slPlaces.residenceName,
    addressLinePrivate: slPlaces.addressLinePrivate,
    canonicalPlaceId: slPlaces.canonicalPlaceId,
    placeKind: slPlaces.placeKind,
    description: slPlaces.description,
    publicationStatus: slPlaces.publicationStatus,
  }).from(slPlaces).where(eq(slPlaces.id, input.placeId)).limit(1);
  if (!residence) fail('NOT_FOUND', 'Residence not found.');
  const [location] = await db.select({ label: placeName.name })
    .from(place).innerJoin(placeName, and(eq(placeName.placeId, place.placeId), eq(placeName.nameRole, 'preferred_public'), eq(placeName.nameState, 'active')))
    .where(eq(place.placeId, residence.canonicalPlaceId)).limit(1);
  const [authority] = await db.select({ agentUserId: slListingAuthorities.agentUserId, status: slListingAuthorities.status, expiresAt: slListingAuthorities.expiresAt, grantor: slResponsibleParties.displayName, grantorRole: slResponsibleParties.partyRole, contactEmail: slResponsibleParties.contactEmail })
    .from(slListingAuthorities).innerJoin(slResponsibleParties, eq(slResponsibleParties.id, slListingAuthorities.responsiblePartyId))
    .where(and(eq(slListingAuthorities.placeId, input.placeId), eq(slListingAuthorities.status, 'approved')))
    .orderBy(desc(slListingAuthorities.createdAt)).limit(1);
  const residenceMedia = await db.select({ id: slPlaceMedia.id, caption: slPlaceMedia.caption, reviewStatus: slPlaceMedia.reviewStatus, urlKey: slPlaceMedia.storageKey })
    .from(slPlaceMedia).where(eq(slPlaceMedia.placeId, input.placeId)).orderBy(asc(slPlaceMedia.displayOrder));
  const facilities = await db.select({ code: slPlaceSpecifications.specificationCode }).from(slPlaceSpecifications)
    .where(and(eq(slPlaceSpecifications.placeId, input.placeId), eq(slPlaceSpecifications.valueState, 'known'), eq(slPlaceSpecifications.booleanValue, 1)));
  let space: any = null;
  if (input.subjectType === 'space') {
    if (!input.spaceId) fail('BAD_REQUEST', 'Space review requires an accommodation space.');
    const [row] = await db.select().from(slSpaces).where(and(eq(slSpaces.id, input.spaceId), eq(slSpaces.placeId, input.placeId))).limit(1);
    if (!row) fail('NOT_FOUND', 'Accommodation space not found.');
    const [availability] = await db.select().from(slSpaceAvailability).where(eq(slSpaceAvailability.spaceId, row.id)).limit(1);
    const [features, media] = await Promise.all([
      db.select({ code: slSpaceSpecifications.specificationCode }).from(slSpaceSpecifications).where(and(eq(slSpaceSpecifications.spaceId, row.id), eq(slSpaceSpecifications.valueState, 'known'), eq(slSpaceSpecifications.booleanValue, 1))),
      db.select({ id: slSpaceMedia.id, caption: slSpaceMedia.caption, reviewStatus: slSpaceMedia.reviewStatus, urlKey: slSpaceMedia.storageKey }).from(slSpaceMedia).where(eq(slSpaceMedia.spaceId, row.id)).orderBy(asc(slSpaceMedia.displayOrder)),
    ]);
    space = { ...row, availability: availability ? { ...availability, rentAmountMinor: asNumber(availability.rentAmountMinor), bills: billSnapshot(availability.billsIncludedJson) } : null, facilities: features.map(item => item.code), media: media.map(item => ({ ...item, url: resolveMediaDeliveryUrl(item.urlKey) })) };
  }
  return {
    residence: { ...residence, publicLocation: location?.label ?? null, responsibleParty: authority ?? null, facilities: facilities.map(item => item.code), media: residenceMedia.map(item => ({ ...item, url: resolveMediaDeliveryUrl(item.urlKey) })) },
    space,
  };
}

export async function getAuthorityEvidenceDownloadUrl(reviewerUserId: number, evidenceId: number) {
  const db = await database();
  const [row] = await db.select().from(slListingAuthorityEvidence).where(eq(slListingAuthorityEvidence.id, evidenceId)).limit(1);
  if (!row) fail('NOT_FOUND', 'Mandate evidence was not found.');
  if (row.storageAdapter === 's3') return { url: await createSharedLivingEvidenceS3DeliveryUrl(row.storageKey) };
  const token = createSharedLivingEvidenceDeliveryToken({ evidenceId, actorUserId: reviewerUserId, key: row.storageKey });
  return { url: `/api/local-media/private-evidence?deliveryToken=${encodeURIComponent(token)}` };
}

export async function reviewResidenceOrSpace(input: { reviewerUserId: number; placeId: number; subjectType: 'residence' | 'space'; spaceId?: number; decision: 'approve' | 'reject'; reason?: string }) {
  const db = await database();
  return db.transaction(async (tx: any) => {
    const [residence] = await tx.select().from(slPlaces).where(eq(slPlaces.id, input.placeId)).limit(1).for('update');
    if (!residence) fail('NOT_FOUND', 'Residence not found.');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [activeAuthority] = await tx.select({ id: slListingAuthorities.id })
      .from(slListingAuthorities)
      .where(and(eq(slListingAuthorities.placeId, input.placeId), eq(slListingAuthorities.status, 'approved'), lte(slListingAuthorities.effectiveAt, now), gt(slListingAuthorities.expiresAt, now)))
      .limit(1);
    if (!activeAuthority) fail('PRECONDITION_FAILED', 'A current approved mandate is required before publication.');
    if (input.subjectType === 'residence') {
      if (residence.publicationStatus !== 'pending_review') fail('CONFLICT', 'Residence is not awaiting review.');
      const next = input.decision === 'approve' ? 'published' : 'rejected';
      await tx.update(slPlaces).set({ publicationStatus: next }).where(eq(slPlaces.id, input.placeId));
      await tx.update(slPlaceMedia).set({ reviewStatus: input.decision === 'approve' ? 'approved' : 'rejected', reviewedByUserId: input.reviewerUserId, reviewedAt: now, reviewReason: input.reason?.trim() || null }).where(and(eq(slPlaceMedia.placeId, input.placeId), eq(slPlaceMedia.reviewStatus, 'pending_review')));
      if (input.decision === 'approve') await tx.update(slSpaces).set({ publicationStatus: 'published' }).where(and(eq(slSpaces.placeId, input.placeId), eq(slSpaces.publicationStatus, 'approved')));
    } else {
      if (!input.spaceId) fail('BAD_REQUEST', 'A space review requires a space ID.');
      const [space] = await tx.select().from(slSpaces).where(and(eq(slSpaces.id, input.spaceId), eq(slSpaces.placeId, input.placeId))).limit(1).for('update');
      if (!space || space.publicationStatus !== 'pending_review') fail('CONFLICT', 'Space is not awaiting review.');
      const [activeParent] = await tx.select({ publicationStatus: slPlaces.publicationStatus }).from(slPlaces).where(eq(slPlaces.id, input.placeId)).limit(1);
      const next = input.decision === 'approve' ? (activeParent.publicationStatus === 'published' ? 'published' : 'approved') : 'rejected';
      await tx.update(slSpaces).set({ publicationStatus: next }).where(eq(slSpaces.id, input.spaceId));
      await tx.update(slSpaceMedia).set({ reviewStatus: input.decision === 'approve' ? 'approved' : 'rejected', reviewedByUserId: input.reviewerUserId, reviewedAt: now, reviewReason: input.reason?.trim() || null }).where(and(eq(slSpaceMedia.spaceId, input.spaceId), eq(slSpaceMedia.reviewStatus, 'pending_review')));
    }
    await tx.insert(slModerationQueue).values({ placeId: input.placeId, subjectType: input.subjectType, spaceId: input.subjectType === 'space' ? input.spaceId : null, action: input.decision === 'approve' ? 'approve' : 'reject', reviewerUserId: input.reviewerUserId, reason: input.reason?.trim() || null });
    return { ok: true, decision: input.decision };
  });
}

export async function agentResidenceDetail(agentUserId: number, placeId: number) {
  const db = await database();
  const [residence] = await db.select({ id: slPlaces.id, slug: slPlaces.slug, residenceName: slPlaces.residenceName, description: slPlaces.description, placeKind: slPlaces.placeKind, canonicalPlaceId: slPlaces.canonicalPlaceId, publicationStatus: slPlaces.publicationStatus, authorityId: slListingAuthorities.id, authorityStatus: slListingAuthorities.status, authorityExpiry: slListingAuthorities.expiresAt, responsiblePartyName: slResponsibleParties.displayName, responsiblePartyRole: slResponsibleParties.partyRole })
    .from(slPlaces).innerJoin(slListingAuthorities, and(eq(slListingAuthorities.placeId, slPlaces.id), eq(slListingAuthorities.agentUserId, agentUserId))).innerJoin(slResponsibleParties, eq(slResponsibleParties.id, slListingAuthorities.responsiblePartyId)).where(eq(slPlaces.id, placeId)).orderBy(desc(slListingAuthorities.createdAt)).limit(1);
  if (!residence) fail('NOT_FOUND', 'Residence not found.');
  await requireAgentDraftAccess(db, placeId, agentUserId);
  const spaces = await db.select().from(slSpaces).where(eq(slSpaces.placeId, placeId)).orderBy(asc(slSpaces.id));
  const fullSpaces = await Promise.all(spaces.map(async space => {
    const [availability] = await db.select().from(slSpaceAvailability).where(eq(slSpaceAvailability.spaceId, space.id)).limit(1);
    const features = await db.select({ code: slSpaceSpecifications.specificationCode }).from(slSpaceSpecifications).where(and(eq(slSpaceSpecifications.spaceId, space.id), eq(slSpaceSpecifications.valueState, 'known'), eq(slSpaceSpecifications.booleanValue, 1)));
    const media = await db.select({ id: slSpaceMedia.id, caption: slSpaceMedia.caption, reviewStatus: slSpaceMedia.reviewStatus, key: slSpaceMedia.storageKey }).from(slSpaceMedia).where(eq(slSpaceMedia.spaceId, space.id)).orderBy(asc(slSpaceMedia.displayOrder));
    return { ...space, availability: availability ? { ...availability, rentAmountMinor: asNumber(availability.rentAmountMinor), bills: billSnapshot(availability.billsIncludedJson) } : null, facilities: features.map(item => item.code), media: media.map(item => ({ id: item.id, caption: item.caption, reviewStatus: item.reviewStatus, url: resolveMediaDeliveryUrl(item.key) })) };
  }));
  const [placeMedia, placeFacilities] = await Promise.all([
    db.select({ id: slPlaceMedia.id, caption: slPlaceMedia.caption, reviewStatus: slPlaceMedia.reviewStatus, key: slPlaceMedia.storageKey }).from(slPlaceMedia).where(eq(slPlaceMedia.placeId, placeId)).orderBy(asc(slPlaceMedia.displayOrder)),
    db.select({ code: slPlaceSpecifications.specificationCode }).from(slPlaceSpecifications).where(and(eq(slPlaceSpecifications.placeId, placeId), eq(slPlaceSpecifications.valueState, 'known'), eq(slPlaceSpecifications.booleanValue, 1))),
  ]);
  const [evidence] = await db.select({ count: sql<number>`count(*)` }).from(slListingAuthorityEvidence).where(eq(slListingAuthorityEvidence.authorityId, residence.authorityId));
  return { ...residence, authorityEvidenceCount: Number(evidence?.count || 0), spaces: fullSpaces, media: placeMedia.map(item => ({ id: item.id, caption: item.caption, reviewStatus: item.reviewStatus, url: resolveMediaDeliveryUrl(item.key) })), sharedFacilities: placeFacilities.map(item => item.code) };
}

export async function addResidenceFacilities(agentUserId: number, placeId: number, codes: string[]) {
  const db = await database();
  await requireAgentDraftAccess(db, placeId, agentUserId);
  if (codes.some(code => !FACILITY_CODES.has(code))) fail('BAD_REQUEST', 'Unsupported residence facility.');
  return db.transaction(async (tx: any) => {
    for (const code of codes) {
      await tx.insert(slPlaceSpecifications).values({ placeId, specificationCode: code, valueState: 'known', booleanValue: 1 }).onDuplicateKeyUpdate({ set: { valueState: 'known', booleanValue: 1 } });
    }
    const existing = await tx.select({ id: slPlaceSpecifications.id, code: slPlaceSpecifications.specificationCode }).from(slPlaceSpecifications).where(eq(slPlaceSpecifications.placeId, placeId));
    for (const row of existing) if (!codes.includes(row.code)) await tx.update(slPlaceSpecifications).set({ valueState: 'unknown', booleanValue: null }).where(eq(slPlaceSpecifications.id, row.id));
    const [residence] = await tx.select({ status: slPlaces.publicationStatus }).from(slPlaces).where(eq(slPlaces.id, placeId)).limit(1).for('update');
    if (residence && ['published', 'approved', 'rejected'].includes(residence.status)) {
      await tx.update(slPlaces).set({ publicationStatus: 'pending_review' }).where(eq(slPlaces.id, placeId));
      await tx.insert(slModerationQueue).values({ placeId, subjectType: 'residence', action: 'submit' });
    }
    return {
      ok: true,
      publicationStatus:
        residence && ['published', 'approved', 'rejected'].includes(residence.status)
          ? 'pending_review' as const
          : residence?.status || 'draft',
    };
  });
}
