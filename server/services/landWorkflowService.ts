import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  agents,
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
} from '../../drizzle/schema';
import { getDb } from '../db-connection';
import { deriveLandTrustState, type LandClaimCode, type LandClassification } from '../../shared/land-domain';
import { buildLocalMediaUploadUrl, getMediaStorageAdapter, inspectLocalMediaObject } from '../_core/mediaStorage';
import { createLandEvidenceDeliveryToken, createLandEvidenceUploadReservation, createPrivateEvidenceS3DeliveryUrl, createPrivateEvidenceS3UploadUrl, inspectPrivateEvidenceS3Object, verifyLandEvidenceUploadReservation } from './landEvidenceStorage';

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type CaseState = 'draft' | 'pending' | 'reviewing' | 'changes_requested' | 'approved' | 'rejected' | 'suspended';

const timestamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const criticalClaimCodes = new Set<LandClaimCode>(['land_extent', 'access', 'zoning_land_use']);

export function isLandAuthorRole(role: string | null | undefined) {
  return ['agent', 'agency_admin', 'developer', 'super_admin'].includes(String(role));
}

export function isLandReviewerRole(role: string | null | undefined) {
  return String(role) === 'super_admin';
}

export function calculateLandReadiness(input: {
  listing: { askingPrice: unknown; city: string | null; province: string | null; title: string | null; description: string | null };
  asset: { classification: string | null } | null;
  parcels: readonly { extentM2: unknown; provinceId: unknown; cityId: unknown }[];
  authority: { actorType: string; supportingEvidenceId: number | null } | null;
  evidenceCount: number;
  mediaCount: number;
  caseState: CaseState | null;
  hasHighConflict: boolean;
  assertions: readonly { status: string; claimCode: string; expiresAt: Date | null; recheckDueAt: Date | null }[];
}) {
  const draft: string[] = [];
  const submission: string[] = [];
  const publication: string[] = [];
  if (!input.asset?.classification) draft.push('land_classification');
  if (!input.listing.title?.trim()) draft.push('title');
  if (!input.listing.description?.trim()) draft.push('description');
  if (!input.parcels.length) submission.push('parcel_site');
  if (!input.parcels.some(parcel => Number(parcel.extentM2) > 0)) submission.push('land_extent');
  if (!input.parcels.some(parcel => parcel.provinceId || parcel.cityId) || !input.listing.city || !input.listing.province) submission.push('canonical_geography');
  if (!(Number(input.listing.askingPrice) > 0)) submission.push('asking_price');
  if (!input.mediaCount) submission.push('marketing_media');
  if (!input.authority) submission.push('marketing_authority');
  if (input.authority && input.authority.actorType !== 'owner_direct' && !input.authority.supportingEvidenceId && !input.evidenceCount) submission.push('marketing_authority_evidence');
  if (input.caseState !== 'approved') publication.push('land_review_approval');
  if (input.hasHighConflict) publication.push('unresolved_high_severity_conflict');
  const now = new Date();
  if (input.assertions.some(item => criticalClaimCodes.has(item.claimCode as LandClaimCode) && (item.status === 'contradicted' || item.status === 'expired' || (item.expiresAt && item.expiresAt <= now) || (item.recheckDueAt && item.recheckDueAt <= now)))) publication.push('critical_verification_attention');
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

export async function createLandDraft(input: {
  userId: number; classification: LandClassification; title: string; description: string; askingPrice: number;
  city: string; province: string; address?: string | null; intendedUse?: string | null; parcel: { kind: 'erf' | 'portion' | 'farm' | 'remainder' | 'other'; identifier: string; identifierHash: string; extentM2: number; provinceId?: number | null; cityId?: number | null; suburbId?: number | null; geometryConfidence?: 'unknown' | 'approximate' | 'confirmed' };
}) {
  const db = await database();
  const now = timestamp();
  return db.transaction(async tx => {
    const [agent] = await tx.select().from(agents).where(eq(agents.userId, input.userId)).limit(1);
    const slug = `land-${input.classification}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const listingResult = await tx.insert(listings).values({ ownerId: input.userId, agentId: agent?.id ?? null, agencyId: agent?.agencyId ?? null, action: 'sell', propertyType: 'plot', title: input.title.trim(), description: input.description.trim(), askingPrice: String(input.askingPrice), address: input.address || null, city: input.city.trim(), province: input.province.trim(), status: 'draft', approvalStatus: 'pending', slug, propertyDetails: { landEngine: true } } as any);
    const listingId = Number((listingResult as any)[0]?.insertId ?? (listingResult as any).insertId);
    const assetResult = await tx.insert(landAssets).values({ classification: input.classification, intendedUse: input.intendedUse || null, createdByUserId: input.userId });
    const landAssetId = Number((assetResult as any)[0]?.insertId ?? (assetResult as any).insertId);
    const parcelResult = await tx.insert(landParcels).values({ jurisdictionCountryCode: 'ZA', provinceId: input.parcel.provinceId || null, cityId: input.parcel.cityId || null, suburbId: input.parcel.suburbId || null, parcelKind: input.parcel.kind, privateIdentifier: input.parcel.identifier.trim(), privateIdentifierHash: input.parcel.identifierHash, extentM2: String(input.parcel.extentM2), geometryConfidence: input.parcel.geometryConfidence || 'unknown', identitySource: 'seller', createdByUserId: input.userId });
    const parcelId = Number((parcelResult as any)[0]?.insertId ?? (parcelResult as any).insertId);
    await tx.insert(landAssetParcels).values({ landAssetId, parcelId, relationshipRole: 'primary' });
    await tx.insert(landListingLinks).values({ landAssetId, listingId });
    await tx.insert(landReviewCases).values({ listingId, state: 'draft', submissionSequence: 0, createdAt: now, updatedAt: now });
    return { listingId, landAssetId, parcelId };
  });
}

export async function recordLandClaims(input: { listingId: number; userId: number; claims: readonly { code: LandClaimCode; valueState: 'asserted' | 'unknown' | 'unavailable' | 'not_applicable'; value?: unknown }[] }) {
  const db = await database(); const { link } = await ownedLandListing(db, input.listingId, input.userId);
  await db.transaction(async tx => {
    for (const claim of input.claims) {
      await tx.insert(landClaims).values({ landAssetId: link.landAssetId, claimCode: claim.code, valueState: claim.valueState, claimedValue: claim.valueState === 'asserted' ? claim.value ?? null : null, declaredByUserId: input.userId });
    }
  });
}

export async function declareMarketingAuthority(input: { listingId: number; userId: number; actorType: 'owner_direct' | 'agent' | 'agency' | 'developer' | 'other'; authorityType: 'sole_mandate' | 'open_mandate' | 'joint_mandate' | 'owner_direct' | 'other'; supportingEvidenceId?: number | null; expiresAt?: string | null }) {
  const db = await database(); const { link } = await ownedLandListing(db, input.listingId, input.userId);
  const [agent] = await db.select().from(agents).where(eq(agents.userId, input.userId)).limit(1);
  await db.insert(landMarketingAuthorities).values({ landAssetId: link.landAssetId, actorType: input.actorType, authorityType: input.authorityType, agentId: agent?.id ?? null, agencyId: agent?.agencyId ?? null, authorityStatus: 'pending', supportingEvidenceId: input.supportingEvidenceId || null, expiresAt: input.expiresAt || null });
}

export async function requestPrivateLandEvidenceUpload(input: { listingId: number; userId: number; fileName: string; contentType: string }) {
  const db = await database(); const { link } = await ownedLandListing(db, input.listingId, input.userId);
  const reservation = createLandEvidenceUploadReservation({ landAssetId: link.landAssetId, userId: input.userId, fileName: input.fileName, contentType: input.contentType });
  const uploadUrl = getMediaStorageAdapter() === 'local' ? buildLocalMediaUploadUrl(reservation.token) : await createPrivateEvidenceS3UploadUrl(reservation.payload);
  return { uploadUrl, uploadToken: reservation.token, expiresInSeconds: 600 };
}

export async function addPrivateEvidence(input: { listingId: number; userId: number; evidenceType: 'mandate' | 'identity' | 'title_registry' | 'parcel_survey' | 'professional_report' | 'planning' | 'other'; uploadToken: string; parcelId?: number | null }) {
  const db = await database(); const { link } = await ownedLandListing(db, input.listingId, input.userId);
  const reservation = verifyLandEvidenceUploadReservation(input.uploadToken, { userId: input.userId, landAssetId: link.landAssetId });
  const uploaded = getMediaStorageAdapter() === 'local'
    ? await inspectLocalMediaObject(reservation.key, reservation.contentType)
    : await inspectPrivateEvidenceS3Object(reservation);
  const result = await db.insert(landEvidenceDocuments).values({ landAssetId: link.landAssetId, parcelId: input.parcelId || null, evidenceType: input.evidenceType, privateStorageKey: reservation.key, originalFileName: reservation.fileName, mimeType: uploaded.contentType, byteSize: uploaded.contentLength, uploadedByUserId: input.userId });
  return Number((result as any)[0]?.insertId ?? (result as any).insertId);
}

export async function landWorkflowSnapshot(listingId: number, userId?: number) {
  const db = await database();
  const [link] = await db.select().from(landListingLinks).where(and(eq(landListingLinks.listingId, listingId), eq(landListingLinks.linkStatus, 'active'))).limit(1);
  if (!link) throw new Error('Land listing not found.');
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing || (userId && listing.ownerId !== userId)) throw new Error('Land listing not found.');
  const [asset] = await db.select().from(landAssets).where(eq(landAssets.id, link.landAssetId)).limit(1);
  const parcels = await db.select({ id: landParcels.id, extentM2: landParcels.extentM2, provinceId: landParcels.provinceId, cityId: landParcels.cityId }).from(landAssetParcels).innerJoin(landParcels, eq(landAssetParcels.parcelId, landParcels.id)).where(eq(landAssetParcels.landAssetId, link.landAssetId));
  const [authority] = await db.select().from(landMarketingAuthorities).where(eq(landMarketingAuthorities.landAssetId, link.landAssetId)).orderBy(desc(landMarketingAuthorities.createdAt)).limit(1);
  const evidence = await db.select().from(landEvidenceDocuments).where(eq(landEvidenceDocuments.landAssetId, link.landAssetId));
  const assertions = await db.select({ claimCode: landClaims.claimCode, status: landVerificationAssertions.status, expiresAt: landVerificationAssertions.expiresAt, recheckDueAt: landVerificationAssertions.recheckDueAt }).from(landVerificationAssertions).innerJoin(landClaims, eq(landVerificationAssertions.claimId, landClaims.id)).where(eq(landClaims.landAssetId, link.landAssetId));
  const [reviewCase] = await db.select().from(landReviewCases).where(eq(landReviewCases.listingId, listingId)).limit(1);
  const reviewEvents = reviewCase
    ? await db.select().from(landReviewEvents).where(eq(landReviewEvents.reviewCaseId, reviewCase.id)).orderBy(desc(landReviewEvents.occurredAt), desc(landReviewEvents.id))
    : [];
  const conflicts = await db.select({ id: landConflictCases.id }).from(landConflictCases).where(and(eq(landConflictCases.landAssetId, link.landAssetId), eq(landConflictCases.severity, 'high'), inArray(landConflictCases.reviewStatus, ['open', 'reviewing'])));
  const media = await db.select({ id: listingMedia.id }).from(listingMedia).where(eq(listingMedia.listingId, listingId));
  const mediaCount = media.length;
  const readiness = calculateLandReadiness({ listing, asset, parcels, authority: authority || null, evidenceCount: evidence.length, mediaCount, caseState: (reviewCase?.state as CaseState | undefined) || null, hasHighConflict: conflicts.length > 0, assertions: assertions as any });
  const trustState = reviewCase?.state === 'approved' ? deriveLandTrustState({ marketingAuthorityActive: authority?.authorityStatus === 'active', hasHighSeverityOpenConflict: conflicts.length > 0, assertions: assertions as any }) : null;
  return { listing, asset, parcels, authority, reviewCase, reviewEvents, readiness, trustState, evidence: evidence.map(({ privateStorageKey, ...safe }) => safe) };
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
  const now = timestamp();
  await db.transaction(async tx => {
    await tx.update(landReviewCases).set({ state: nextState, currentReviewerUserId: input.action === 'start' ? input.reviewerUserId : null, decisionByUserId: input.action === 'start' ? null : input.reviewerUserId, reviewedAt: now, decidedAt: input.action === 'start' ? null : now, updatedAt: now }).where(eq(landReviewCases.id, reviewCase.id));
    await tx.insert(landReviewEvents).values({ reviewCaseId: reviewCase.id, submissionSequence: reviewCase.submissionSequence, actorUserId: input.reviewerUserId, eventType, previousState: String(reviewCase.state), nextState, reasonCode: input.reasonCode || null, comment: input.comment || null, occurredAt: now });
    if (input.action === 'request_changes') await tx.update(listings).set({ status: 'draft', approvalStatus: 'pending', updatedAt: now } as any).where(eq(listings.id, input.listingId));
    if (input.action === 'reject') await tx.update(listings).set({ status: 'rejected', approvalStatus: 'rejected', reviewedBy: input.reviewerUserId, reviewedAt: now, rejectionNote: input.comment || null } as any).where(eq(listings.id, input.listingId));
    if (input.action === 'approve') {
      await tx.update(landMarketingAuthorities).set({ authorityStatus: 'active', reviewerUserId: input.reviewerUserId, reviewedAt: now, reviewerOutcome: 'approved', updatedAt: now }).where(eq(landMarketingAuthorities.landAssetId, snapshot.asset!.id));
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
