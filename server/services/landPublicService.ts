import { and, desc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm';
import { landAssets, landAssetParcels, landClaims, landConflictCases, landListingLinks, landMarketingAuthorities, landParcels, landReviewCases, landVerificationAssertions, listingMedia, listings } from '../../drizzle/schema';
import { getDb } from '../db-connection';
import { deriveLandTrustState, type LandPublicClassification } from '../../shared/land-domain';
import { locationResolver } from './locationResolverService';
import { searchAreaAuthority } from './searchAreaAuthority';
import { buildCanonicalLocationQueryBoundary, buildSearchAreaQueryBoundary, getSearchAreaQueryMembers, type PublicSearchQueryBoundary } from './searchAreaQueryBoundary';

export type LandPublicSearchInput = { classification?: LandPublicClassification; city?: string; province?: string; locationId?: string; locationIds?: string[]; searchAreaId?: string; minPrice?: number; maxPrice?: number; minSize?: number; maxSize?: number };
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

async function resolveGeography(input: LandPublicSearchInput): Promise<PublicSearchQueryBoundary | undefined> {
  if (input.searchAreaId) {
    const resolution = await searchAreaAuthority.resolveSearchArea(input.searchAreaId, { journey: 'buy' });
    if (resolution.status === 'unavailable' || !resolution.definition.supportedJourneys.includes('buy')) {
      throw new Error('This Search Area is not available for Land search.');
    }
    const boundary = buildSearchAreaQueryBoundary(resolution);
    if (!boundary) throw new Error('This Search Area has no safe canonical query boundary.');
    return boundary;
  }

  const ids = Array.from(new Set([...(input.locationIds || []), ...(input.locationId ? [input.locationId] : [])]));
  if (ids.length === 0 && (input.city || input.province)) {
    const resolved = await locationResolver.resolvePublicLocation({
      ...(input.province ? { provinceSlug: input.province.trim().toLowerCase().replace(/\s+/g, '-') } : {}),
      ...(input.city ? { citySlug: input.city.trim().toLowerCase().replace(/\s+/g, '-') } : {}),
    });
    if (resolved.status !== 'resolved' || !resolved.location) throw new Error('That Land location could not be resolved canonically.');
    const location = resolved.location;
    const canonicalId = location.level === 'province' ? `province:${location.province.id}` : location.level === 'city' ? `city:${location.city!.id}` : `suburb:${location.suburb!.id}`;
    ids.push(canonicalId);
  }
  if (ids.length === 0) return undefined;
  const resolved = await Promise.all(ids.map(id => locationResolver.resolvePublicLocation({ locationId: id })));
  if (resolved.some(item => item.status !== 'resolved' || !item.location)) throw new Error('One or more Land locations could not be resolved canonically.');
  const boundary = buildCanonicalLocationQueryBoundary(
    resolved.map(item => item.location!).filter(Boolean),
    ids,
  );
  if (!boundary) throw new Error('Land multi-location search requires exact sibling canonical locations.');
  return boundary;
}

function geographyPredicate(boundary: PublicSearchQueryBoundary | undefined) {
  if (!boundary) return undefined;
  const members = boundary.kind === 'canonical_locations' ? boundary.members : getSearchAreaQueryMembers(boundary);
  const predicates = members.map(member => member.scopeKind === 'province' || ('level' in member && member.level === 'province')
    ? sql`gp.province_id = ${member.provinceId}`
    : member.scopeKind === 'metro_city' || ('level' in member && member.level === 'city')
      ? sql`gp.city_id = ${member.cityId!}`
      : sql`gp.suburb_id = ${member.suburbId!}`);
  return predicates.length ? or(...predicates) : undefined;
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

export async function searchPublicLand(input: LandPublicSearchInput = {}) {
  const db = await database(); const conditions = [eq(landListingLinks.linkStatus, 'active'), eq(landReviewCases.state, 'approved'), eq(landMarketingAuthorities.authorityStatus, 'active'), inArray(listings.status, ['approved', 'published']), eq(listings.approvalStatus, 'approved')];
  if (input.classification) conditions.push(eq(landAssets.classification, input.classification));
  const geography = geographyPredicate(await resolveGeography(input));
  if (geography) conditions.push(sql`EXISTS (SELECT 1 FROM land_asset_parcels gap INNER JOIN land_parcels gp ON gap.parcel_id = gp.id WHERE gap.land_asset_id = ${landAssets.id} AND ${geography})`);
  if (input.minPrice !== undefined) conditions.push(gte(listings.askingPrice, String(input.minPrice))); if (input.maxPrice !== undefined) conditions.push(lte(listings.askingPrice, String(input.maxPrice)));
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
