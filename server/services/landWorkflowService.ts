import { createHash } from 'node:crypto';
import { and, desc, eq, inArray, isNull, ne } from 'drizzle-orm';
import {
  agents,
  cities,
  landAssetParcels,
  landAssets,
  landClaims,
  landConflictCases,
  landEvidenceAccessAudit,
  landEvidenceDocuments,
  landListingLinks,
  landMarketingAuthorities,
  landParcels,
  landReviewCases,
  landReviewEvents,
  landVerificationAssertions,
  listingMedia,
  listings,
  provinces,
  suburbs,
} from '../../drizzle/schema';
import { getDb } from '../db-connection';
import {
  deriveLandTrustState,
  isLandMarketingAuthorityActive,
  isLandPublicClassification,
  isLandTimestampDue,
  type LandClaimCode,
  type LandPublicClassification,
} from '../../shared/land-domain';
import { buildLocalMediaUploadUrl, getMediaStorageAdapter, inspectLocalMediaObject } from '../_core/mediaStorage';
import { createLandEvidenceDeliveryToken, createLandEvidenceUploadReservation, createPrivateEvidenceS3DeliveryUrl, createPrivateEvidenceS3UploadUrl, inspectPrivateEvidenceS3Object, verifyLandEvidenceUploadReservation } from './landEvidenceStorage';
import { verifyListingMediaUploadToken } from './listingMediaAuthority';
import { isCompletedListingImage } from '../../shared/listing-media';

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type CaseState = 'draft' | 'pending' | 'reviewing' | 'changes_requested' | 'approved' | 'rejected' | 'suspended';

const timestamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const criticalClaimCodes = new Set<LandClaimCode>(['land_extent', 'access', 'zoning_land_use']);

export function hashLandParcelIdentifier(identifier: string): string {
  const normalized = identifier.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) throw new Error('A Land parcel reference is required.');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function isLandAuthorRole(role: string | null | undefined) {
  return ['agent', 'agency_admin', 'property_developer', 'super_admin'].includes(String(role));
}

export function isLandReviewerRole(role: string | null | undefined) {
  return String(role) === 'super_admin';
}

export function calculateLandReadiness(input: {
  listing: { askingPrice: unknown; city: string | null; province: string | null; title: string | null; description: string | null };
  asset: { classification: string | null } | null;
  parcels: readonly { extentM2: unknown; provinceId: unknown; cityId: unknown }[];
  authority: {
    actorType: string;
    supportingEvidenceId: number | null;
    expiresAt?: Date | string | null;
  } | null;
  marketingImageCount: number;
  caseState: CaseState | null;
  hasHighConflict: boolean;
  assertions: readonly { status: string; claimCode: string; expiresAt: Date | string | null; recheckDueAt: Date | string | null }[];
}) {
  const draft: string[] = [];
  const submission: string[] = [];
  const publication: string[] = [];
  if (!input.asset?.classification) draft.push('land_classification');
  if (!input.listing.title?.trim()) draft.push('title');
  if (!input.listing.description?.trim()) draft.push('description');
  if (!input.parcels.length) submission.push('parcel_site');
  if (!input.parcels.some(parcel => Number(parcel.extentM2) > 0)) submission.push('land_extent');
  if (!input.parcels.every(parcel => parcel.provinceId && parcel.cityId) || !input.listing.city || !input.listing.province) submission.push('canonical_geography');
  if (!(Number(input.listing.askingPrice) > 0)) submission.push('asking_price');
  if (!input.marketingImageCount) submission.push('marketing_media');
  if (!input.authority) submission.push('marketing_authority');
  if (input.authority && input.authority.actorType !== 'owner_direct' && !input.authority.supportingEvidenceId) submission.push('marketing_authority_evidence');
  if (input.authority?.expiresAt && isLandTimestampDue(input.authority.expiresAt, new Date())) submission.push('marketing_authority_expired');
  if (input.caseState !== 'approved') publication.push('land_review_approval');
  if (input.hasHighConflict) publication.push('unresolved_high_severity_conflict');
  const now = new Date();
  if (input.assertions.some(item => criticalClaimCodes.has(item.claimCode as LandClaimCode) && (item.status === 'contradicted' || item.status === 'expired' || isLandTimestampDue(item.expiresAt, now) || isLandTimestampDue(item.recheckDueAt, now)))) publication.push('critical_verification_attention');
  return {
    draftComplete: draft.length === 0,
    submissionReady: draft.length === 0 && submission.length === 0,
    publicationEligible: draft.length === 0 && submission.length === 0 && publication.length === 0,
    blockers: { draft, submission, publication },
  };
}

async function database() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db as Database;
}

async function ownedLandListing(db: Database, listingId: number, userId: number) {
  const [row] = await db.select().from(listings).where(and(eq(listings.id, listingId), eq(listings.ownerId, userId))).limit(1);
  if (!row) throw new Error('Land listing was not found or is not owned by this user.');
  const [link] = await db.select().from(landListingLinks).where(and(eq(landListingLinks.listingId, listingId), eq(landListingLinks.linkStatus, 'active'))).limit(1);
  if (!link) throw new Error('Listing is not a Land listing.');
  return { listing: row, link };
}

async function ownedEditableLandListing(db: Database, listingId: number, userId: number) {
  const owned = await ownedLandListing(db, listingId, userId);
  const [reviewCase] = await db
    .select({ id: landReviewCases.id, state: landReviewCases.state })
    .from(landReviewCases)
    .where(eq(landReviewCases.listingId, listingId))
    .limit(1);
  if (!reviewCase || !['draft', 'changes_requested'].includes(String(reviewCase.state))) {
    throw new Error('Land authoring is locked while this listing is in review or public.');
  }
  return { ...owned, reviewCase };
}

export async function createLandDraft(input: {
  userId: number;
  classification: LandPublicClassification;
  title: string;
  description: string;
  askingPrice: number;
  address?: string | null;
  intendedUse?: string | null;
  parcel: {
    kind: 'erf' | 'portion' | 'farm' | 'remainder' | 'other';
    identifier: string;
    extentM2: number;
    provinceId: number;
    cityId: number;
    suburbId?: number | null;
    geometryConfidence?: 'unknown' | 'approximate' | 'confirmed';
  };
}) {
  if (!isLandPublicClassification(input.classification)) {
    throw new Error('This Land classification is not available for public authoring.');
  }
  if (!Number.isFinite(input.askingPrice) || input.askingPrice <= 0) {
    throw new Error('A positive Land asking price is required.');
  }
  if (!Number.isFinite(input.parcel.extentM2) || input.parcel.extentM2 <= 0) {
    throw new Error('A positive Land parcel extent is required.');
  }
  const privateIdentifier = input.parcel.identifier.trim();
  const privateIdentifierHash = hashLandParcelIdentifier(privateIdentifier);
  const db = await database();
  const now = timestamp();
  return db.transaction(async tx => {
    const [canonicalLocation] = await tx
      .select({
        cityId: cities.id,
        cityName: cities.name,
        provinceId: provinces.id,
        provinceName: provinces.name,
      })
      .from(cities)
      .innerJoin(provinces, eq(cities.provinceId, provinces.id))
      .where(
        and(
          eq(cities.id, input.parcel.cityId),
          eq(provinces.id, input.parcel.provinceId),
          ne(cities.status, 'retired'),
          ne(provinces.status, 'retired'),
        ),
      )
      .limit(1);
    if (!canonicalLocation) {
      throw new Error('The Land city and province must be one active canonical location pair.');
    }
    if (input.parcel.suburbId) {
      const [suburb] = await tx
        .select({ id: suburbs.id })
        .from(suburbs)
        .where(
          and(
            eq(suburbs.id, input.parcel.suburbId),
            eq(suburbs.cityId, canonicalLocation.cityId),
            ne(suburbs.status, 'retired'),
          ),
        )
        .limit(1);
      if (!suburb) {
        throw new Error('The selected Land suburb is not part of the canonical city.');
      }
    }
    const [agent] = await tx.select().from(agents).where(eq(agents.userId, input.userId)).limit(1);
    const slug = `land-${input.classification}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const listingResult = await tx.insert(listings).values({ ownerId: input.userId, agentId: agent?.id ?? null, agencyId: agent?.agencyId ?? null, action: 'sell', propertyType: 'plot', title: input.title.trim(), description: input.description.trim(), askingPrice: String(input.askingPrice), address: input.address || null, city: canonicalLocation.cityName, province: canonicalLocation.provinceName, status: 'draft', approvalStatus: 'pending', slug, propertyDetails: { landEngine: true } } as any);
    const listingId = Number((listingResult as any)[0]?.insertId ?? (listingResult as any).insertId);
    const assetResult = await tx.insert(landAssets).values({ classification: input.classification, intendedUse: input.intendedUse || null, createdByUserId: input.userId });
    const landAssetId = Number((assetResult as any)[0]?.insertId ?? (assetResult as any).insertId);
    const parcelResult = await tx.insert(landParcels).values({ jurisdictionCountryCode: 'ZA', provinceId: canonicalLocation.provinceId, cityId: canonicalLocation.cityId, suburbId: input.parcel.suburbId || null, parcelKind: input.parcel.kind, privateIdentifier, privateIdentifierHash, extentM2: String(input.parcel.extentM2), geometryConfidence: input.parcel.geometryConfidence || 'unknown', identitySource: 'seller', createdByUserId: input.userId });
    const parcelId = Number((parcelResult as any)[0]?.insertId ?? (parcelResult as any).insertId);
    await tx.insert(landAssetParcels).values({ landAssetId, parcelId, relationshipRole: 'primary' });
    await tx.insert(landListingLinks).values({ landAssetId, listingId });
    await tx.insert(landReviewCases).values({ listingId, state: 'draft', submissionSequence: 0, createdAt: now, updatedAt: now });
    return { listingId, landAssetId, parcelId };
  });
}

export async function recordLandClaims(input: { listingId: number; userId: number; claims: readonly { code: LandClaimCode; valueState: 'asserted' | 'unknown' | 'unavailable' | 'not_applicable'; value?: unknown }[] }) {
  const db = await database(); const { link } = await ownedEditableLandListing(db, input.listingId, input.userId);
  await db.transaction(async tx => {
    for (const claim of input.claims) {
      // A correction must replace the public-facing declaration, while
      // retaining the prior declaration for the private review audit trail.
      // Asset-level claims are the only claims this authoring procedure writes;
      // never withdraw a future parcel-specific declaration with the same code.
      const now = timestamp();
      await tx
        .update(landClaims)
        .set({ withdrawnAt: now, updatedAt: now })
        .where(
          and(
            eq(landClaims.landAssetId, link.landAssetId),
            eq(landClaims.claimCode, claim.code),
            isNull(landClaims.parcelId),
            isNull(landClaims.withdrawnAt),
          ),
        );
      await tx.insert(landClaims).values({ landAssetId: link.landAssetId, claimCode: claim.code, valueState: claim.valueState, claimedValue: claim.valueState === 'asserted' ? claim.value ?? null : null, declaredByUserId: input.userId });
    }
  });
}

export async function declareMarketingAuthority(input: { listingId: number; userId: number; actorType: 'owner_direct' | 'agent' | 'agency' | 'developer' | 'other'; authorityType: 'sole_mandate' | 'open_mandate' | 'joint_mandate' | 'owner_direct' | 'other'; supportingEvidenceId?: number | null; expiresAt?: string | null }) {
  const db = await database(); const { link } = await ownedEditableLandListing(db, input.listingId, input.userId);
  if (input.actorType !== 'owner_direct' && !input.supportingEvidenceId) {
    throw new Error('A non-owner Land marketing authority requires private mandate evidence.');
  }
  if (input.actorType === 'owner_direct' && input.authorityType !== 'owner_direct') {
    throw new Error('An owner-direct Land authority must use the owner-direct authority type.');
  }
  if (input.actorType !== 'owner_direct' && input.authorityType === 'owner_direct') {
    throw new Error('Only an owner-direct actor may use the owner-direct authority type.');
  }
  if (input.expiresAt && isLandTimestampDue(input.expiresAt, new Date())) {
    throw new Error('Land marketing authority expiry must be in the future.');
  }
  if (input.supportingEvidenceId) {
    const [evidence] = await db.select({ id: landEvidenceDocuments.id, evidenceType: landEvidenceDocuments.evidenceType }).from(landEvidenceDocuments)
      .where(and(eq(landEvidenceDocuments.id, input.supportingEvidenceId), eq(landEvidenceDocuments.landAssetId, link.landAssetId))).limit(1);
    if (!evidence || evidence.evidenceType !== 'mandate') throw new Error('Supporting evidence must be private mandate evidence for this Land Asset.');
  }
  const [agent] = await db.select().from(agents).where(eq(agents.userId, input.userId)).limit(1);
  await db.insert(landMarketingAuthorities).values({ landAssetId: link.landAssetId, actorType: input.actorType, authorityType: input.authorityType, agentId: agent?.id ?? null, agencyId: agent?.agencyId ?? null, authorityStatus: 'pending', supportingEvidenceId: input.supportingEvidenceId || null, expiresAt: input.expiresAt || null });
}

export async function requestPrivateLandEvidenceUpload(input: { listingId: number; userId: number; fileName: string; contentType: string }) {
  const db = await database(); const { link } = await ownedEditableLandListing(db, input.listingId, input.userId);
  const reservation = createLandEvidenceUploadReservation({ landAssetId: link.landAssetId, userId: input.userId, fileName: input.fileName, contentType: input.contentType });
  const uploadUrl = getMediaStorageAdapter() === 'local' ? buildLocalMediaUploadUrl(reservation.token) : await createPrivateEvidenceS3UploadUrl(reservation.payload);
  return { uploadUrl, uploadToken: reservation.token, expiresInSeconds: 600 };
}

export async function addPrivateEvidence(input: { listingId: number; userId: number; evidenceType: 'mandate' | 'identity' | 'title_registry' | 'parcel_survey' | 'professional_report' | 'planning' | 'other'; uploadToken: string; parcelId?: number | null }) {
  const db = await database(); const { link } = await ownedEditableLandListing(db, input.listingId, input.userId);
  if (input.parcelId) {
    const [parcelLink] = await db
      .select({ parcelId: landAssetParcels.parcelId })
      .from(landAssetParcels)
      .where(
        and(
          eq(landAssetParcels.landAssetId, link.landAssetId),
          eq(landAssetParcels.parcelId, input.parcelId),
        ),
      )
      .limit(1);
    if (!parcelLink) {
      throw new Error('Private Land evidence must target a parcel in this Land Asset.');
    }
  }
  const reservation = verifyLandEvidenceUploadReservation(input.uploadToken, { userId: input.userId, landAssetId: link.landAssetId });
  const uploaded = getMediaStorageAdapter() === 'local'
    ? await inspectLocalMediaObject(reservation.key, reservation.contentType)
    : await inspectPrivateEvidenceS3Object(reservation);
  const result = await db.insert(landEvidenceDocuments).values({ landAssetId: link.landAssetId, parcelId: input.parcelId || null, evidenceType: input.evidenceType, privateStorageKey: reservation.key, originalFileName: reservation.fileName, mimeType: uploaded.contentType, byteSize: uploaded.contentLength, uploadedByUserId: input.userId });
  return Number((result as any)[0]?.insertId ?? (result as any).insertId);
}

/**
 * Land evidence and Land marketing stay on separate storage paths. Only a
 * confirmed public Listing image may satisfy the public marketing gate.
 */
export async function attachLandMarketingMedia(input: {
  listingId: number;
  userId: number;
  uploadToken: string;
}) {
  const db = await database();
  await ownedEditableLandListing(db, input.listingId, input.userId);
  const media = verifyListingMediaUploadToken(input.uploadToken, {
    userId: input.userId,
    listingId: input.listingId,
    requireConfirmed: true,
  });
  if (media.mediaType !== 'image') {
    throw new Error('Land marketing media must be a public image; documents belong in private evidence.');
  }
  const existingMedia = await db
    .select()
    .from(listingMedia)
    .where(eq(listingMedia.listingId, input.listingId));
  const displayOrder =
    existingMedia.reduce((maximum, item) => Math.max(maximum, Number(item.displayOrder || 0)), -1) +
    1;
  const hasPrimaryImage = existingMedia.some(item => isCompletedListingImage(item));
  const existingUpload = existingMedia.find(
    item => item.originalUrl === media.key || item.processedUrl === media.key,
  );
  if (existingUpload) {
    return { mediaId: Number(existingUpload.id) };
  }
  const result = await db.insert(listingMedia).values({
    listingId: input.listingId,
    mediaType: 'image',
    originalUrl: media.key,
    processedUrl: media.key,
    originalFileName: media.fileName,
    originalFileSize: media.fileSize,
    mimeType: media.contentType,
    processingStatus: 'completed',
    isPrimary: hasPrimaryImage ? 0 : 1,
    displayOrder,
  });
  return { mediaId: Number((result as any)[0]?.insertId ?? (result as any).insertId) };
}

export async function landWorkflowSnapshot(listingId: number, userId?: number) {
  const db = await database();
  const [link] = await db.select().from(landListingLinks).where(and(eq(landListingLinks.listingId, listingId), eq(landListingLinks.linkStatus, 'active'))).limit(1);
  if (!link) throw new Error('Land listing not found.');
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing || (userId && listing.ownerId !== userId)) throw new Error('Land listing not found.');
  const [asset] = await db.select().from(landAssets).where(eq(landAssets.id, link.landAssetId)).limit(1);
  const parcels = await db.select({ id: landParcels.id, extentM2: landParcels.extentM2, provinceId: landParcels.provinceId, cityId: landParcels.cityId }).from(landAssetParcels).innerJoin(landParcels, eq(landAssetParcels.parcelId, landParcels.id)).where(eq(landAssetParcels.landAssetId, link.landAssetId));
  const claims = await db.select({ id: landClaims.id, claimCode: landClaims.claimCode, valueState: landClaims.valueState, claimedValue: landClaims.claimedValue, parcelId: landClaims.parcelId, declaredAt: landClaims.declaredAt }).from(landClaims).where(and(eq(landClaims.landAssetId, link.landAssetId), isNull(landClaims.withdrawnAt))).orderBy(desc(landClaims.declaredAt), desc(landClaims.id));
  const [authority] = await db.select().from(landMarketingAuthorities).where(eq(landMarketingAuthorities.landAssetId, link.landAssetId)).orderBy(desc(landMarketingAuthorities.createdAt), desc(landMarketingAuthorities.id)).limit(1);
  const evidence = await db.select().from(landEvidenceDocuments).where(eq(landEvidenceDocuments.landAssetId, link.landAssetId)).orderBy(desc(landEvidenceDocuments.createdAt), desc(landEvidenceDocuments.id));
  const assertions = await db.select({ id: landVerificationAssertions.id, claimCode: landClaims.claimCode, status: landVerificationAssertions.status, publicConclusion: landVerificationAssertions.publicConclusion, limitations: landVerificationAssertions.limitations, sourceProvider: landVerificationAssertions.sourceProvider, verifierType: landVerificationAssertions.verifierType, verifierName: landVerificationAssertions.verifierName, checkedAt: landVerificationAssertions.checkedAt, expiresAt: landVerificationAssertions.expiresAt, recheckDueAt: landVerificationAssertions.recheckDueAt }).from(landVerificationAssertions).innerJoin(landClaims, eq(landVerificationAssertions.claimId, landClaims.id)).where(and(eq(landClaims.landAssetId, link.landAssetId), isNull(landClaims.withdrawnAt)));
  const [reviewCase] = await db.select().from(landReviewCases).where(eq(landReviewCases.listingId, listingId)).limit(1);
  const reviewEvents = reviewCase
    ? await db.select().from(landReviewEvents).where(eq(landReviewEvents.reviewCaseId, reviewCase.id)).orderBy(desc(landReviewEvents.occurredAt), desc(landReviewEvents.id))
    : [];
  const conflicts = await db.select({ id: landConflictCases.id }).from(landConflictCases).where(and(eq(landConflictCases.landAssetId, link.landAssetId), eq(landConflictCases.severity, 'high'), inArray(landConflictCases.reviewStatus, ['open', 'reviewing'])));
  const media = await db.select({ id: listingMedia.id, mediaType: listingMedia.mediaType, originalUrl: listingMedia.originalUrl, processedUrl: listingMedia.processedUrl, processingStatus: listingMedia.processingStatus, displayOrder: listingMedia.displayOrder, isPrimary: listingMedia.isPrimary }).from(listingMedia).where(eq(listingMedia.listingId, listingId));
  const marketingImageCount = media.filter(item => isCompletedListingImage(item)).length;
  const readiness = calculateLandReadiness({ listing, asset, parcels, authority: authority || null, marketingImageCount, caseState: (reviewCase?.state as CaseState | undefined) || null, hasHighConflict: conflicts.length > 0, assertions: assertions as any });
  const trustState = reviewCase?.state === 'approved' ? deriveLandTrustState({ marketingAuthorityActive: isLandMarketingAuthorityActive({ status: authority?.authorityStatus, expiresAt: authority?.expiresAt }), hasHighSeverityOpenConflict: conflicts.length > 0, assertions: assertions as any }) : null;
  return { listing, asset, parcels, claims, assertions, authority, reviewCase, reviewEvents, readiness, trustState, marketingImageCount, evidence: evidence.map(({ privateStorageKey, ...safe }) => safe) };
}

export async function landReviewQueue() {
  const db = await database();
  return db.select({ listingId: landReviewCases.listingId, state: landReviewCases.state, submissionSequence: landReviewCases.submissionSequence, submittedAt: landReviewCases.submittedAt, title: listings.title, city: listings.city, province: listings.province, classification: landAssets.classification })
    .from(landReviewCases)
    .innerJoin(listings, eq(landReviewCases.listingId, listings.id))
    .innerJoin(landListingLinks, and(eq(landListingLinks.listingId, listings.id), eq(landListingLinks.linkStatus, 'active')))
    .innerJoin(landAssets, eq(landAssets.id, landListingLinks.landAssetId))
    .where(inArray(landReviewCases.state, ['pending', 'reviewing', 'changes_requested', 'suspended']))
    .orderBy(desc(landReviewCases.updatedAt));
}

export async function submitLandForReview(input: { listingId: number; userId: number }) {
  const db = await database(); const snapshot = await landWorkflowSnapshot(input.listingId, input.userId);
  if (!snapshot.readiness.submissionReady) throw new Error(`Land submission is not ready: ${snapshot.readiness.blockers.submission.join(', ') || snapshot.readiness.blockers.draft.join(', ')}`);
  const reviewCase = snapshot.reviewCase; if (!reviewCase) throw new Error('Land review case missing.');
  if (!['draft', 'changes_requested'].includes(String(reviewCase.state))) throw new Error(`Land review cannot be submitted from ${reviewCase.state}.`);
  const nextSequence = Number(reviewCase.submissionSequence) + 1; const now = timestamp(); const eventType = nextSequence === 1 ? 'submitted' : 'resubmitted';
  await db.transaction(async tx => {
    await tx.update(landReviewCases).set({ state: 'pending', submissionSequence: nextSequence, submittedAt: now, currentReviewerUserId: null, decisionByUserId: null, decidedAt: null, updatedAt: now }).where(eq(landReviewCases.id, reviewCase.id));
    await tx.insert(landReviewEvents).values({ reviewCaseId: reviewCase.id, submissionSequence: nextSequence, actorUserId: input.userId, eventType, previousState: String(reviewCase.state), nextState: 'pending', occurredAt: now });
    await tx.update(listings).set({ status: 'pending_review', approvalStatus: 'pending', updatedAt: now } as any).where(eq(listings.id, input.listingId));
  });
}

export async function transitionLandReview(input: { listingId: number; reviewerUserId: number; action: 'start' | 'request_changes' | 'reject' | 'approve' | 'suspend'; reasonCode?: string | null; comment?: string | null }) {
  const db = await database(); const snapshot = await landWorkflowSnapshot(input.listingId); const reviewCase = snapshot.reviewCase; if (!reviewCase) throw new Error('Land review case missing.');
  const map = { start: ['reviewing', 'review_started'], request_changes: ['changes_requested', 'changes_requested'], reject: ['rejected', 'rejected'], approve: ['approved', 'approved'], suspend: ['suspended', 'suspended'] } as const;
  const [nextState, eventType] = map[input.action];
  const allowedFrom: Record<typeof input.action, readonly CaseState[]> = {
    start: ['pending'],
    request_changes: ['reviewing'],
    reject: ['reviewing'],
    approve: ['reviewing'],
    suspend: ['approved', 'reviewing'],
  };
  if (!allowedFrom[input.action].includes(reviewCase.state as CaseState)) throw new Error(`Land review cannot ${input.action} from ${reviewCase.state}.`);
  if ((input.action === 'request_changes' || input.action === 'reject') && !input.comment?.trim()) throw new Error('An actionable reviewer comment is required.');
  if (input.action === 'approve' && !snapshot.readiness.submissionReady) throw new Error('Land submission is not ready for approval.');
  if (input.action === 'approve' && snapshot.readiness.blockers.publication.filter(item => item !== 'land_review_approval').length) throw new Error(`Land publication gates failed: ${snapshot.readiness.blockers.publication.filter(item => item !== 'land_review_approval').join(', ')}`);
  if (input.action === 'approve' && snapshot.authority?.authorityStatus !== 'pending') throw new Error('The current Land marketing authority is not awaiting approval.');
  const now = timestamp();
  await db.transaction(async tx => {
    await tx.update(landReviewCases).set({ state: nextState, currentReviewerUserId: input.action === 'start' ? input.reviewerUserId : null, decisionByUserId: input.action === 'start' ? null : input.reviewerUserId, reviewedAt: now, decidedAt: input.action === 'start' ? null : now, updatedAt: now }).where(eq(landReviewCases.id, reviewCase.id));
    await tx.insert(landReviewEvents).values({ reviewCaseId: reviewCase.id, submissionSequence: reviewCase.submissionSequence, actorUserId: input.reviewerUserId, eventType, previousState: String(reviewCase.state), nextState, reasonCode: input.reasonCode || null, comment: input.comment || null, occurredAt: now });
    if (input.action === 'request_changes') await tx.update(listings).set({ status: 'draft', approvalStatus: 'pending', updatedAt: now } as any).where(eq(listings.id, input.listingId));
    if (input.action === 'reject') await tx.update(listings).set({ status: 'rejected', approvalStatus: 'rejected', reviewedBy: input.reviewerUserId, reviewedAt: now, rejectionNote: input.comment || null } as any).where(eq(listings.id, input.listingId));
    if (input.action === 'approve') {
      await tx.update(landMarketingAuthorities).set({ authorityStatus: 'active', reviewerUserId: input.reviewerUserId, reviewedAt: now, reviewerOutcome: 'approved', updatedAt: now }).where(eq(landMarketingAuthorities.id, snapshot.authority!.id));
      await tx.update(landAssets).set({ lifecycleStatus: 'active', updatedAt: now }).where(eq(landAssets.id, snapshot.asset!.id));
      await tx.update(listings).set({ status: 'approved', approvalStatus: 'approved', reviewedBy: input.reviewerUserId, reviewedAt: now, updatedAt: now } as any).where(eq(listings.id, input.listingId));
    }
  });
}

export async function accessPrivateLandEvidence(input: { evidenceDocumentId: number; actorUserId: number; role?: string | null; requestCorrelationId?: string | null }) {
  const db = await database(); const [evidence] = await db.select().from(landEvidenceDocuments).where(eq(landEvidenceDocuments.id, input.evidenceDocumentId)).limit(1);
  if (!evidence) throw new Error('Private evidence not found.');
  const [link] = await db.select().from(landListingLinks).where(and(eq(landListingLinks.landAssetId, evidence.landAssetId), eq(landListingLinks.linkStatus, 'active'))).limit(1);
  const [listing] = link ? await db.select().from(listings).where(eq(listings.id, link.listingId)).limit(1) : [];
  const reviewer = isLandReviewerRole(input.role); const custodian = listing?.ownerId === input.actorUserId || evidence.uploadedByUserId === input.actorUserId;
  const allowed = reviewer || custodian;
  await db.insert(landEvidenceAccessAudit).values({ evidenceDocumentId: evidence.id, actorUserId: input.actorUserId, action: 'retrieve', authorizationOutcome: allowed ? 'allowed' : 'denied', accessContext: reviewer ? 'land_reviewer' : custodian ? 'author_custodian' : 'other', requestCorrelationId: input.requestCorrelationId || null });
  if (!allowed) throw new Error('Not authorized to access private Land evidence.');
  const deliveryUrl = getMediaStorageAdapter() === 'local'
    ? `/api/local-media/private-evidence?deliveryToken=${encodeURIComponent(createLandEvidenceDeliveryToken({ evidenceDocumentId: evidence.id, actorUserId: input.actorUserId, key: evidence.privateStorageKey }))}`
    : await createPrivateEvidenceS3DeliveryUrl(evidence.privateStorageKey);
  return { id: evidence.id, mimeType: evidence.mimeType, originalFileName: evidence.originalFileName, accessGranted: true, deliveryUrl, expiresInSeconds: 300 };
}
