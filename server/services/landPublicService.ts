import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { landAssets, landAssetParcels, landClaims, landConflictCases, landListingLinks, landMarketingAuthorities, landParcels, landReviewCases, landVerificationAssertions, listingMedia, listings } from '../../drizzle/schema';
import { getDb } from '../db-connection';
import { deriveLandTrustState } from '../../shared/land-domain';

type Input = { classification?: 'residential_stand' | 'development_land' | 'commercial_industrial_land'; city?: string; province?: string; minPrice?: number; maxPrice?: number; minSize?: number; maxSize?: number };
async function database() { const db = await getDb(); if (!db) throw new Error('Database not available'); return db; }
export function isPublicLandEligible(input: { listingStatus: string; listingApprovalStatus: string | null; reviewState: string; authorityStatus: string; hasBlockingConflict: boolean }) {
  return ['approved', 'published'].includes(input.listingStatus) && input.listingApprovalStatus === 'approved' && input.reviewState === 'approved' && input.authorityStatus === 'active' && !input.hasBlockingConflict;
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
  const rows = await db.select({ listingId: listings.id, slug: listings.slug, title: listings.title, description: listings.description, askingPrice: listings.askingPrice, city: listings.city, province: listings.province, classification: landAssets.classification, intendedUse: landAssets.intendedUse, precision: landAssets.publicLocationPrecision, assetId: landAssets.id, agentId: landMarketingAuthorities.agentId, agencyId: landMarketingAuthorities.agencyId, extentM2: landParcels.extentM2, parcelCount: sql<number>`count(${landAssetParcels.id})` }).from(landListingLinks).innerJoin(listings, eq(landListingLinks.listingId, listings.id)).innerJoin(landAssets, eq(landListingLinks.landAssetId, landAssets.id)).innerJoin(landReviewCases, eq(landReviewCases.listingId, listings.id)).innerJoin(landMarketingAuthorities, eq(landMarketingAuthorities.landAssetId, landAssets.id)).innerJoin(landAssetParcels, eq(landAssetParcels.landAssetId, landAssets.id)).innerJoin(landParcels, eq(landAssetParcels.parcelId, landParcels.id)).where(and(...conditions)).groupBy(listings.id, landAssets.id, landParcels.extentM2).orderBy(desc(listings.createdAt));
  const publicRows = await Promise.all(rows.map(async row => {
    const conflicts = await db.select({ id: landConflictCases.id }).from(landConflictCases).where(and(eq(landConflictCases.landAssetId, row.assetId), eq(landConflictCases.severity, 'high'), sql`${landConflictCases.reviewStatus} in ('open','reviewing')`));
    if (!isPublicLandEligible({ listingStatus: 'approved', listingApprovalStatus: 'approved', reviewState: 'approved', authorityStatus: 'active', hasBlockingConflict: conflicts.length > 0 })) return null;
    return { ...row, href: `/land/${row.slug}`, passport: await passport(db, row.assetId) };
  }));
  return publicRows.filter((row): row is NonNullable<typeof row> => Boolean(row)).filter(row => (!input.minSize || Number(row.extentM2) >= input.minSize) && (!input.maxSize || Number(row.extentM2) <= input.maxSize));
}
export async function publicLandDetail(slug: string) { const results = await searchPublicLand(); return results.find(item => item.slug === slug) ?? null; }
