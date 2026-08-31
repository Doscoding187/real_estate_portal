import {
  and,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  landAssets,
  landAssetParcels,
  landClaims,
  landConflictCases,
  landListingLinks,
  landMarketingAuthorities,
  landParcels,
  landReviewCases,
  landVerificationAssertions,
  listingMedia,
  listings,
} from '../../drizzle/schema';
import { getDb } from '../db-connection';
import {
  LAND_PUBLIC_CLASSIFICATIONS,
  deriveLandTrustState,
  isLandMarketingAuthorityActive,
  isLandPublicClassification,
  toPublicLandPassportAssertions,
  type LandPublicClassification,
} from '../../shared/land-domain';
import { validateLandSearchGeography } from '../../shared/landSearchGeography';
import { getCompletedListingImages, getListingMediaUrl } from '../../shared/listing-media';
import { resolveMediaDeliveryUrl } from '../_core/mediaStorage';
import { locationResolver } from './locationResolverService';
import { searchAreaAuthority } from './searchAreaAuthority';
import {
  buildCanonicalLocationQueryBoundary,
  buildSearchAreaQueryBoundary,
  getSearchAreaQueryMembers,
  type PublicSearchQueryBoundary,
} from './searchAreaQueryBoundary';

export type LandPublicSearchInput = {
  classification?: LandPublicClassification;
  city?: string;
  province?: string;
  locationId?: string;
  locationIds?: string[];
  searchAreaId?: string;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
};

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type PublicLandRow = {
  listingId: number;
  slug: string;
  title: string;
  description: string | null;
  askingPrice: string | null;
  city: string | null;
  province: string | null;
  classification: string;
  intendedUse: string | null;
  precision: 'approximate' | 'exact';
  assetId: number;
  assetLifecycleStatus: string;
  agentId: number | null;
  agencyId: number | null;
  authorityExpiresAt: string | null;
  extentM2: string | null;
  parcelCount: number;
};

const timestamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

async function database(): Promise<Database> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db as Database;
}

/**
 * This service is also a public boundary. Router validation alone is not
 * enough: a direct caller must never be able to combine or omit geography.
 */
export function assertPublicLandSearchInput(input: LandPublicSearchInput): void {
  const geographyIssue = validateLandSearchGeography(input);
  if (geographyIssue) throw new Error(geographyIssue.message);
  if (input.classification && !isLandPublicClassification(input.classification)) {
    throw new Error('This Land classification is not available for public search.');
  }
  for (const [label, value] of [
    ['minimum price', input.minPrice],
    ['maximum price', input.maxPrice],
    ['minimum extent', input.minSize],
    ['maximum extent', input.maxSize],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      throw new Error(`Land ${label} must be a positive finite number.`);
    }
  }
  if (input.minPrice !== undefined && input.maxPrice !== undefined && input.minPrice > input.maxPrice) {
    throw new Error('Land minimum price cannot exceed maximum price.');
  }
  if (input.minSize !== undefined && input.maxSize !== undefined && input.minSize > input.maxSize) {
    throw new Error('Land minimum extent cannot exceed maximum extent.');
  }
}

export function isPublicLandEligible(input: {
  listingStatus: string;
  listingApprovalStatus: string | null;
  reviewState: string;
  classification: string;
  authorityStatus: string;
  authorityExpiresAt?: Date | string | null;
  assetLifecycleStatus: string;
  hasBlockingConflict: boolean;
  hasCompletedMarketingImage: boolean;
}) {
  return (
    ['approved', 'published'].includes(input.listingStatus) &&
    input.listingApprovalStatus === 'approved' &&
    input.reviewState === 'approved' &&
    isLandPublicClassification(input.classification) &&
    input.assetLifecycleStatus === 'active' &&
    isLandMarketingAuthorityActive({
      status: input.authorityStatus,
      expiresAt: input.authorityExpiresAt,
    }) &&
    !input.hasBlockingConflict &&
    input.hasCompletedMarketingImage
  );
}

export function publicLocationPrecision(precision: 'approximate' | 'exact') {
  return precision === 'exact' ? 'Known site position' : 'Approximate site location';
}

export function publicParcelComposition(parcelCount: number) {
  return parcelCount === 1 ? 'This site comprises 1 parcel.' : `This site comprises ${parcelCount} parcels.`;
}

async function resolveGeography(input: LandPublicSearchInput): Promise<PublicSearchQueryBoundary> {
  if (input.searchAreaId) {
    const resolution = await searchAreaAuthority.resolveSearchArea(input.searchAreaId, {
      journey: 'plot_land',
    });
    if (resolution.status === 'unavailable' || !resolution.definition.supportedJourneys.includes('plot_land')) {
      throw new Error('This Search Area is not available for Land search.');
    }
    const boundary = buildSearchAreaQueryBoundary(resolution);
    if (!boundary) throw new Error('This Search Area has no safe canonical query boundary.');
    return boundary;
  }

  if (input.locationId) {
    const resolution = await locationResolver.resolvePublicLocation({ locationId: input.locationId });
    if (resolution.status !== 'resolved' || !resolution.location) {
      throw new Error('That Land location could not be resolved canonically.');
    }
    const boundary = buildCanonicalLocationQueryBoundary([resolution.location], [input.locationId]);
    if (!boundary) throw new Error('That Land location is not an exact canonical query boundary.');
    return boundary;
  }

  if (input.locationIds?.length) {
    const resolutions = await Promise.all(
      input.locationIds.map(locationId => locationResolver.resolvePublicLocation({ locationId })),
    );
    if (resolutions.some(item => item.status !== 'resolved' || !item.location)) {
      throw new Error('One or more Land locations could not be resolved canonically.');
    }
    const boundary = buildCanonicalLocationQueryBoundary(
      resolutions.map(item => item.location!).filter(Boolean),
      input.locationIds,
    );
    if (!boundary) throw new Error('Land multi-location search requires exact sibling canonical locations.');
    return boundary;
  }

  const resolution = await locationResolver.resolvePublicLocation({
    provinceSlug: input.province!.trim().toLowerCase().replace(/\s+/g, '-'),
    citySlug: input.city!.trim().toLowerCase().replace(/\s+/g, '-'),
  });
  if (resolution.status !== 'resolved' || !resolution.location) {
    throw new Error('That Land location could not be resolved canonically.');
  }
  const location = resolution.location;
  const canonicalId =
    location.level === 'province'
      ? `province:${location.province.id}`
      : location.level === 'city'
        ? `city:${location.city!.id}`
        : `suburb:${location.suburb!.id}`;
  const boundary = buildCanonicalLocationQueryBoundary([location], [canonicalId]);
  if (!boundary) throw new Error('That typed Land location is not an exact canonical query boundary.');
  return boundary;
}

function geographyPredicate(boundary: PublicSearchQueryBoundary): SQL {
  const members = boundary.kind === 'canonical_locations' ? boundary.members : getSearchAreaQueryMembers(boundary);
  const predicates = members.map(member =>
    member.scopeKind === 'province' || ('level' in member && member.level === 'province')
      ? sql`gp.province_id = ${member.provinceId}`
      : member.scopeKind === 'metro_city' || ('level' in member && member.level === 'city')
        ? sql`gp.city_id = ${member.cityId!}`
        : sql`gp.suburb_id = ${member.suburbId!}`,
  );
  if (!predicates.length) throw new Error('Land search has no safe canonical query boundary.');
  return or(...predicates)!;
}

/** Keep historical active mandates from multiplying a public listing or changing its recipient. */
function latestActiveAuthorityCondition(): SQL {
  return sql`NOT EXISTS (
    SELECT 1
    FROM land_marketing_authorities AS newer_land_authority
    WHERE newer_land_authority.land_asset_id = ${landMarketingAuthorities.landAssetId}
      AND newer_land_authority.authority_status = 'active'
      AND newer_land_authority.id > ${landMarketingAuthorities.id}
  )`;
}

function publicLandEligibilityConditions(now = timestamp()): SQL[] {
  return [
    eq(landListingLinks.linkStatus, 'active'),
    eq(landAssets.lifecycleStatus, 'active'),
    inArray(landAssets.classification, LAND_PUBLIC_CLASSIFICATIONS),
    eq(landReviewCases.state, 'approved'),
    eq(landMarketingAuthorities.authorityStatus, 'active'),
    or(isNull(landMarketingAuthorities.expiresAt), gt(landMarketingAuthorities.expiresAt, now))!,
    latestActiveAuthorityCondition(),
    inArray(listings.status, ['approved', 'published']),
    eq(listings.approvalStatus, 'approved'),
  ];
}

function parcelSummary(db: Database) {
  return db
    .select({
      landAssetId: landAssetParcels.landAssetId,
      extentM2: sql<string | null>`sum(${landParcels.extentM2})`.as('extent_m2'),
      parcelCount: sql<number>`count(${landAssetParcels.id})`.as('parcel_count'),
    })
    .from(landAssetParcels)
    .innerJoin(landParcels, eq(landAssetParcels.parcelId, landParcels.id))
    .where(eq(landParcels.lifecycleStatus, 'active'))
    .groupBy(landAssetParcels.landAssetId)
    .as('land_parcel_summary');
}

async function selectPublicLandRows(db: Database, conditions: SQL[]) {
  const summary = parcelSummary(db);
  return db
    .select({
      listingId: listings.id,
      slug: listings.slug,
      title: listings.title,
      description: listings.description,
      askingPrice: listings.askingPrice,
      city: listings.city,
      province: listings.province,
      classification: landAssets.classification,
      intendedUse: landAssets.intendedUse,
      precision: landAssets.publicLocationPrecision,
      assetId: landAssets.id,
      assetLifecycleStatus: landAssets.lifecycleStatus,
      agentId: landMarketingAuthorities.agentId,
      agencyId: landMarketingAuthorities.agencyId,
      authorityExpiresAt: landMarketingAuthorities.expiresAt,
      extentM2: summary.extentM2,
      parcelCount: summary.parcelCount,
    })
    .from(landListingLinks)
    .innerJoin(listings, eq(landListingLinks.listingId, listings.id))
    .innerJoin(landAssets, eq(landListingLinks.landAssetId, landAssets.id))
    .innerJoin(landReviewCases, eq(landReviewCases.listingId, listings.id))
    .innerJoin(landMarketingAuthorities, eq(landMarketingAuthorities.landAssetId, landAssets.id))
    .innerJoin(summary, eq(summary.landAssetId, landAssets.id))
    .where(and(...conditions))
    .orderBy(desc(listings.createdAt));
}

export function projectPublicLandMedia(
  mediaRows: readonly any[],
  resolveMedia: (rawUrl: string | null | undefined) => string | null = resolveMediaDeliveryUrl,
) {
  return getCompletedListingImages([...mediaRows])
    .flatMap(item => {
      const rawUrl = getListingMediaUrl(item);
      if (!rawUrl) return [];
      try {
        const url = resolveMedia(rawUrl);
        return url
          ? [
              {
                url,
                isPrimary: Number(item.isPrimary || 0) === 1,
                displayOrder: Number(item.displayOrder || 0),
              },
            ]
          : [];
      } catch {
        return [];
      }
    })
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

async function publicLandMedia(db: Database, listingId: number) {
  const rows = await db
    .select({
      id: listingMedia.id,
      mediaType: listingMedia.mediaType,
      originalUrl: listingMedia.originalUrl,
      processedUrl: listingMedia.processedUrl,
      previewUrl: listingMedia.previewUrl,
      thumbnailUrl: listingMedia.thumbnailUrl,
      processingStatus: listingMedia.processingStatus,
      isPrimary: listingMedia.isPrimary,
      displayOrder: listingMedia.displayOrder,
    })
    .from(listingMedia)
    .where(eq(listingMedia.listingId, listingId));
  return projectPublicLandMedia(rows);
}

async function passport(db: Database, assetId: number) {
  const claims = await db
    .select()
    .from(landClaims)
    .where(and(eq(landClaims.landAssetId, assetId), isNull(landClaims.withdrawnAt)));
  const assertions = claims.length
    ? await db
        .select({
          claimCode: landClaims.claimCode,
          status: landVerificationAssertions.status,
          publicConclusion: landVerificationAssertions.publicConclusion,
          limitations: landVerificationAssertions.limitations,
          sourceProvider: landVerificationAssertions.sourceProvider,
          verifierType: landVerificationAssertions.verifierType,
          verifierName: landVerificationAssertions.verifierName,
          checkedAt: landVerificationAssertions.checkedAt,
          recheckDueAt: landVerificationAssertions.recheckDueAt,
          expiresAt: landVerificationAssertions.expiresAt,
        })
        .from(landVerificationAssertions)
        .innerJoin(landClaims, eq(landVerificationAssertions.claimId, landClaims.id))
        .where(and(eq(landClaims.landAssetId, assetId), isNull(landClaims.withdrawnAt)))
    : [];
  const authority = await db
    .select({ status: landMarketingAuthorities.authorityStatus, expiresAt: landMarketingAuthorities.expiresAt })
    .from(landMarketingAuthorities)
    .where(
      and(
        eq(landMarketingAuthorities.landAssetId, assetId),
        eq(landMarketingAuthorities.authorityStatus, 'active'),
        latestActiveAuthorityCondition(),
      ),
    )
    .limit(1);
  const conflicts = await db
    .select({ id: landConflictCases.id })
    .from(landConflictCases)
    .where(
      and(
        eq(landConflictCases.landAssetId, assetId),
        eq(landConflictCases.severity, 'high'),
        sql`${landConflictCases.reviewStatus} in ('open','reviewing')`,
      ),
    );
  return {
    trustState: deriveLandTrustState({
      marketingAuthorityActive: isLandMarketingAuthorityActive({
        status: authority[0]?.status,
        expiresAt: authority[0]?.expiresAt,
      }),
      hasHighSeverityOpenConflict: conflicts.length > 0,
      assertions: assertions as any,
    }),
    claims: claims.map(claim => ({ code: claim.claimCode, state: claim.valueState })),
    assertions: toPublicLandPassportAssertions(assertions as any),
  };
}

/** Explicit allow-list boundary between internal Land rows and the public API. */
export function toPublicLandDto(
  row: PublicLandRow,
  passportValue: Awaited<ReturnType<typeof passport>>,
  media: ReturnType<typeof projectPublicLandMedia> = [],
) {
  const coverImageUrl = media.find(item => item.isPrimary)?.url || media[0]?.url;
  return {
    listingId: row.listingId,
    slug: row.slug,
    title: row.title,
    description: row.description,
    askingPrice: row.askingPrice,
    city: row.city,
    province: row.province,
    classification: row.classification,
    intendedUse: row.intendedUse,
    precision: row.precision,
    extentM2: row.extentM2,
    parcelCount: Number(row.parcelCount),
    href: `/land/${row.slug}`,
    passport: passportValue,
    media,
    ...(coverImageUrl ? { coverImageUrl } : {}),
  };
}

async function isRowPublic(
  db: Database,
  row: PublicLandRow,
  media?: ReturnType<typeof projectPublicLandMedia>,
) {
  const [conflicts, resolvedMedia] = await Promise.all([
    db
      .select({ id: landConflictCases.id })
      .from(landConflictCases)
      .where(
        and(
          eq(landConflictCases.landAssetId, row.assetId),
          eq(landConflictCases.severity, 'high'),
          sql`${landConflictCases.reviewStatus} in ('open','reviewing')`,
        ),
      ),
    media ? Promise.resolve(media) : publicLandMedia(db, row.listingId),
  ]);
  return isPublicLandEligible({
    listingStatus: 'approved',
    listingApprovalStatus: 'approved',
    reviewState: 'approved',
    classification: row.classification,
    authorityStatus: 'active',
    authorityExpiresAt: row.authorityExpiresAt,
    assetLifecycleStatus: row.assetLifecycleStatus,
    hasBlockingConflict: conflicts.length > 0,
    hasCompletedMarketingImage: resolvedMedia.length > 0,
  });
}

async function toPublicRow(db: Database, row: PublicLandRow) {
  const [passportValue, media] = await Promise.all([
    passport(db, row.assetId),
    publicLandMedia(db, row.listingId),
  ]);
  if (!(await isRowPublic(db, row, media))) return null;
  return toPublicLandDto(row, passportValue, media);
}

export async function searchPublicLand(input: LandPublicSearchInput) {
  assertPublicLandSearchInput(input);
  const db = await database();
  const boundary = await resolveGeography(input);
  const conditions = publicLandEligibilityConditions();
  if (input.classification) conditions.push(eq(landAssets.classification, input.classification));
  conditions.push(
    sql`EXISTS (SELECT 1 FROM land_asset_parcels gap INNER JOIN land_parcels gp ON gap.parcel_id = gp.id WHERE gap.land_asset_id = ${landAssets.id} AND gp.lifecycle_status = 'active' AND ${geographyPredicate(boundary)})`,
  );
  if (input.minPrice !== undefined) conditions.push(gte(listings.askingPrice, String(input.minPrice)));
  if (input.maxPrice !== undefined) conditions.push(lte(listings.askingPrice, String(input.maxPrice)));

  const rows = (await selectPublicLandRows(db, conditions)) as PublicLandRow[];
  const publicRows = await Promise.all(rows.map(row => toPublicRow(db, row)));
  return publicRows
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .filter(
      row =>
        (input.minSize === undefined || Number(row.extentM2) >= input.minSize) &&
        (input.maxSize === undefined || Number(row.extentM2) <= input.maxSize),
    );
}

/** Server-only custody lookup; Land lead recipients are never accepted from the client. */
export async function resolvePublicLandLeadCustody(listingId: number) {
  const db = await database();
  const rows = (await selectPublicLandRows(db, [
    ...publicLandEligibilityConditions(),
    eq(listings.id, listingId),
  ])) as PublicLandRow[];
  const row = rows[0];
  if (!row || !(await isRowPublic(db, row))) return null;
  return { listingId: row.listingId, agentId: row.agentId, agencyId: row.agencyId };
}

/** A detail is a direct public-record lookup, not an unscoped public search. */
export async function publicLandDetail(slug: string) {
  const db = await database();
  const rows = (await selectPublicLandRows(db, [
    ...publicLandEligibilityConditions(),
    eq(listings.slug, slug.trim()),
  ])) as PublicLandRow[];
  return rows[0] ? toPublicRow(db, rows[0]) : null;
}
