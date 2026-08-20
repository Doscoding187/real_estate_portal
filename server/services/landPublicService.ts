import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { landAssets, landAssetParcels, landClaims, landConflictCases, landListingLinks, landMarketingAuthorities, landParcels, landReviewCases, landVerificationAssertions, listingMedia, listings } from '../../drizzle/schema';
import { getDb } from '../db-connection';
import { deriveLandTrustState } from '../../shared/land-domain';

type Input = { classification?: 'residential_stand' | 'development_land' | 'commercial_industrial_land'; city?: string; province?: string; minPrice?: number; maxPrice?: number; minSize?: number; maxSize?: number };
type PublicLandRow = { listingId: number; slug: string; title: string; description: string | null; askingPrice: string | null; city: string | null; province: string | null; classification: string; intendedUse: string | null; precision: 'approximate' | 'exact'; assetId: number; agentId: number | null; agencyId: number | null; extentM2: string | null; parcelCount: number };
async function database() { const db = await getDb(); if (!db) throw new Error('Database not available'); return db; }
export function isPublicLandEligible(input: { listingStatus: string; listingApprovalStatus: string | null; reviewState: string; authorityStatus: string; hasBlockingConflict: boolean }) {
  return ['approved', 'published'].includes(input.listingStatus) && input.listingApprovalStatus === 'approved' && input.reviewState === 'approved' && input.authorityStatus === 'active' && !input.hasBlockingConflict;
}
export function publicLocationPrecision(precision: 'approximate' | 'exact') {
  return precision === 'exact' ? 'Known site position' : 'Approximate site location';
}
export function publicParcelComposition(parcelCount: number) {
  return parcelCount === 1 ? 'This site comprises 1 parcel.' : `This site comprises ${parcelCount} parcels.`;
}
/** Explicit allow-list boundary between internal Land rows and the public API. */
export function toPublicLandDto(row: PublicLandRow, passportValue: Awaited<ReturnType<typeof passport>>) {
  return {
    listingId: row.listingId, slug: row.slug, title: row.title, description: row.description,
    askingPrice: row.askingPrice, city: row.city, province: row.province,
    classification: row.classification, intendedUse: row.intendedUse, precision: row.precision,
    extentM2: row.extentM2, parcelCount: Number(row.parcelCount),
    href: `/land/${row.slug}`, passport: passportValue,
    // These are routing identifiers for the existing lead authority, not evidence or parcel identity.
    agentId: row.agentId, agencyId: row.agencyId,
  };
}

async function passport(db: Awaited<ReturnType<typeof database>>, assetId: number) {
  const claims = await db.select().from(landClaims).where(eq(landClaims.landAssetId, assetId));
  const assertions = claims.length ? await db.select({ claimCode: landClaims.claimCode, status: landVerificationAssertions.status, publicConclusion: landVerificationAssertions.publicConclusion, limitations: landVerificationAssertions.limitations, sourceProvider: landVerificationAssertions.sourceProvider, verifierType: landVerificationAssertions.verifierType, verifierName: landVerificationAssertions.verifierName, checkedAt: landVerificationAssertions.checkedAt, recheckDueAt: landVerificationAssertions.recheckDueAt, expiresAt: landVerificationAssertions.expiresAt }).from(landVerificationAssertions).innerJoin(landClaims, eq(landVerificationAssertions.claimId, landClaims.id)).where(eq(landClaims.landAssetId, assetId)) : [];
  const authority = await db.select().from(landMarketingAuthorities).where(and(eq(landMarketingAuthorities.landAssetId, assetId), eq(landMarketingAuthorities.authorityStatus, 'active'))).limit(1);
  const conflicts = await db.select({ id: landConflictCases.id }).from(landConflictCases).where(and(eq(landConflictCases.landAssetId, assetId), eq(landConflictCases.severity, 'high'), sql`${landConflictCases.reviewStatus} in ('open','reviewing')`));
  return { trustState: authority[0] ? deriveLandTrustState({ marketingAuthorityActive: true, hasHighSeverityOpenConflict: conflicts.length > 0, assertions: assertions as any }) : null, claims: claims.map(claim => ({ code: claim.claimCode, state: claim.valueState, value: claim.claimedValue })), assertions };
}

export async function searchPublicLand(input: Input = {}) {
  const db = await database(); const conditions = [eq(landListingLinks.linkStatus, 'active'), eq(landReviewCases.state, 'approved'), eq(landMarketingAuthorities.authorityStatus, 'active'), inArray(listings.status, ['approved', 'published']), eq(listings.approvalStatus, 'approved')];
  if (input.classification) conditions.push(eq(landAssets.classification, input.classification)); if (input.city) conditions.push(eq(listings.city, input.city)); if (input.province) conditions.push(eq(listings.province, input.province)); if (input.minPrice) conditions.push(gte(listings.askingPrice, String(input.minPrice))); if (input.maxPrice) conditions.push(lte(listings.askingPrice, String(input.maxPrice)));
  const parcelSummary = db.select({ landAssetId: landAssetParcels.landAssetId, extentM2: sql<string | null>`sum(${landParcels.extentM2})`, parcelCount: sql<number>`count(${landAssetParcels.id})` }).from(landAssetParcels).innerJoin(landParcels, eq(landAssetParcels.parcelId, landParcels.id)).groupBy(landAssetParcels.landAssetId).as('land_parcel_summary');
  const rows = await db.select({ listingId: listings.id, slug: listings.slug, title: listings.title, description: listings.description, askingPrice: listings.askingPrice, city: listings.city, province: listings.province, classification: landAssets.classification, intendedUse: landAssets.intendedUse, precision: landAssets.publicLocationPrecision, assetId: landAssets.id, agentId: landMarketingAuthorities.agentId, agencyId: landMarketingAuthorities.agencyId, extentM2: parcelSummary.extentM2, parcelCount: parcelSummary.parcelCount }).from(landListingLinks).innerJoin(listings, eq(landListingLinks.listingId, listings.id)).innerJoin(landAssets, eq(landListingLinks.landAssetId, landAssets.id)).innerJoin(landReviewCases, eq(landReviewCases.listingId, listings.id)).innerJoin(landMarketingAuthorities, eq(landMarketingAuthorities.landAssetId, landAssets.id)).innerJoin(parcelSummary, eq(parcelSummary.landAssetId, landAssets.id)).where(and(...conditions)).orderBy(desc(listings.createdAt));
  const publicRows = await Promise.all(rows.map(async row => {
    const conflicts = await db.select({ id: landConflictCases.id }).from(landConflictCases).where(and(eq(landConflictCases.landAssetId, row.assetId), eq(landConflictCases.severity, 'high'), sql`${landConflictCases.reviewStatus} in ('open','reviewing')`));
    if (!isPublicLandEligible({ listingStatus: 'approved', listingApprovalStatus: 'approved', reviewState: 'approved', authorityStatus: 'active', hasBlockingConflict: conflicts.length > 0 })) return null;
    return toPublicLandDto(row, await passport(db, row.assetId));
  }));
  return publicRows.filter((row): row is NonNullable<typeof row> => Boolean(row)).filter(row => (!input.minSize || Number(row.extentM2) >= input.minSize) && (!input.maxSize || Number(row.extentM2) <= input.maxSize));
}
/** Server-only custody lookup; Land lead recipients are never accepted from the client. */
export async function resolvePublicLandLeadCustody(listingId: number) {
  const db = await database();
  const [row] = await db.select({ listingId: listings.id, assetId: landAssets.id, agentId: landMarketingAuthorities.agentId, agencyId: landMarketingAuthorities.agencyId }).from(landListingLinks).innerJoin(listings, eq(landListingLinks.listingId, listings.id)).innerJoin(landAssets, eq(landListingLinks.landAssetId, landAssets.id)).innerJoin(landReviewCases, eq(landReviewCases.listingId, listings.id)).innerJoin(landMarketingAuthorities, eq(landMarketingAuthorities.landAssetId, landAssets.id)).where(and(eq(listings.id, listingId), eq(landListingLinks.linkStatus, 'active'), eq(landReviewCases.state, 'approved'), eq(landMarketingAuthorities.authorityStatus, 'active'), inArray(listings.status, ['approved', 'published']), eq(listings.approvalStatus, 'approved'))).limit(1);
  if (!row) return null;
  const conflicts = await db.select({ id: landConflictCases.id }).from(landConflictCases).where(and(eq(landConflictCases.landAssetId, row.assetId), eq(landConflictCases.severity, 'high'), sql`${landConflictCases.reviewStatus} in ('open','reviewing')`));
  return isPublicLandEligible({ listingStatus: 'approved', listingApprovalStatus: 'approved', reviewState: 'approved', authorityStatus: 'active', hasBlockingConflict: conflicts.length > 0 }) ? { listingId: row.listingId, agentId: row.agentId, agencyId: row.agencyId } : null;
}
export async function publicLandDetail(slug: string) { const results = await searchPublicLand(); return results.find(item => item.slug === slug) ?? null; }
