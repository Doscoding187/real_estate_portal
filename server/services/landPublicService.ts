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
  place,
  placeRelationship,
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
import { loadCanonicalPlaceSearchProjection } from './canonicalPlaceSearchService';
import { executePlace } from './placeDiscoveryService';

export type LandPublicSearchInput = {
  classification?: LandPublicClassification;
  canonicalPlaceId?: string;
  canonicalPlaceIds?: string[];
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
  locality: string | null;
  province: string | null;
  classification: string;
  intendedUse: string | null;
  precision: 'approximate' | 'exact';
  assetId: number;
  canonicalPlaceId: string | null;
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
  const retiredAuthorityFields = ['city', 'province', 'locationId', 'locationIds', 'searchAreaId'];
  if (retiredAuthorityFields.some(field => field in input)) {
    throw new Error('Land search accepts canonical Place IDs only.');
  }
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

export function meetsPublicLandPublicationRequirements(input: {
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

export function isPublicLandEligible(input: Parameters<typeof meetsPublicLandPublicationRequirements>[0]) {
  return meetsPublicLandPublicationRequirements(input);
}

export function publicLocationPrecision(precision: 'approximate' | 'exact') {
  return precision === 'exact' ? 'Known site position' : 'Approximate site location';
}

export function publicParcelComposition(parcelCount: number) {
  return parcelCount === 1 ? 'This site comprises 1 parcel.' : `This site comprises ${parcelCount} parcels.`;
}

async function resolveCanonicalPlaceIds(input: LandPublicSearchInput, db: Database): Promise<string[]> {
  const placeIds = input.canonicalPlaceId ? [input.canonicalPlaceId] : input.canonicalPlaceIds || [];
  const resolutions = await Promise.all(placeIds.map(placeId => executePlace(placeId, db)));
  if (resolutions.some(result => !result.ok || result.execution.scope !== 'locality')) {
    throw new Error('Land search requires active, searchable canonical localities.');
  }
  if (placeIds.length < 2) return placeIds;

  const parents = await db
    .select({ fromPlaceId: placeRelationship.fromPlaceId, toPlaceId: placeRelationship.toPlaceId })
    .from(placeRelationship)
    .where(
      and(
        inArray(placeRelationship.fromPlaceId, placeIds),
        eq(placeRelationship.relationshipType, 'administratively_contains'),
      ),
    );
  const uniqueParents = new Set(parents.map(parent => parent.toPlaceId));
  if (parents.length !== placeIds.length || uniqueParents.size !== 1) {
    throw new Error('Land multi-Place search requires selected sibling localities.');
  }
  return placeIds;
}

function geographyPredicate(placeIds: readonly string[]): SQL {
  if (!placeIds.length) throw new Error('Land search requires a canonical locality.');
  return inArray(sql`gp.canonical_place_id`, [...placeIds]);
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
      locality: listings.city,
      province: listings.province,
      classification: landAssets.classification,
      intendedUse: landAssets.intendedUse,
      precision: landAssets.publicLocationPrecision,
      assetId: landAssets.id,
      canonicalPlaceId: listings.canonicalPlaceId,
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
    locality: row.locality,
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
  const placeIds = await resolveCanonicalPlaceIds(input, db);
  const conditions = publicLandEligibilityConditions();
  if (input.classification) conditions.push(eq(landAssets.classification, input.classification));
  conditions.push(
    sql`EXISTS (SELECT 1 FROM land_asset_parcels gap INNER JOIN land_parcels gp ON gap.parcel_id = gp.id WHERE gap.land_asset_id = ${landAssets.id} AND gp.lifecycle_status = 'active' AND ${geographyPredicate(placeIds)})`,
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

export type LandGuideArea = {
  placeId: string;
  label: string;
  listingCount: number;
  href: string;
};

/**
 * Resolve navigational locality choices for a broad Place. This returns links
 * to exact locality searches; it never widens the user's listing query to the
 * selected parent Place.
 */
export async function publicLandGuideAreas(canonicalPlaceId: string): Promise<LandGuideArea[]> {
  const db = await database();
  const parent = await executePlace(canonicalPlaceId, db);
  if (!parent.ok || !['province', 'metro_city'].includes(parent.execution.scope)) {
    throw new Error('Land area guides require an active, searchable province or city Place.');
  }

  let localityIds: string[];
  if (parent.execution.scope === 'metro_city') {
    const childRows = await db
      .select({ placeId: place.placeId })
      .from(placeRelationship)
      .innerJoin(place, eq(placeRelationship.fromPlaceId, place.placeId))
      .where(
        and(
          eq(placeRelationship.toPlaceId, canonicalPlaceId),
          eq(placeRelationship.relationshipType, 'settlement_within'),
          eq(place.lifecycleStatus, 'active'),
          eq(place.searchEligible, 1),
          eq(place.searchScope, 'locality'),
        ),
      );
    localityIds = [
      ...new Set<string>((childRows as { placeId: string }[]).map(row => row.placeId)),
    ];
  } else {
    const provinceProjection = await loadCanonicalPlaceSearchProjection(db, {
      placeIds: [canonicalPlaceId],
      includeProvinceMembers: true,
    });
    localityIds = [...provinceProjection.executions.values()]
      .filter(
        execution =>
          execution.scope === 'locality' && execution.provincePlaceId === canonicalPlaceId,
      )
      .map(execution => execution.placeId);
  }
  if (!localityIds.length) return [];

  // Re-resolve every navigable identity from current authority before rendering
  // a link. Display names never supply or alter a Place ID.
  const localityProjection = await loadCanonicalPlaceSearchProjection(db, {
    placeIds: localityIds,
  });
  const localities = localityIds.flatMap(placeId => {
    const execution = localityProjection.executions.get(placeId);
    const label = localityProjection.labels.get(placeId)?.label;
    return execution?.scope === 'locality' && label?.trim()
      ? [{ placeId, label: label.trim() }]
      : [];
  });
  if (!localities.length) return [];

  const eligibleRows = (await selectPublicLandRows(db, [
    ...publicLandEligibilityConditions(),
    sql`EXISTS (
      SELECT 1
      FROM land_asset_parcels AS guide_asset_parcel
      INNER JOIN land_parcels AS gp ON guide_asset_parcel.parcel_id = gp.id
      WHERE guide_asset_parcel.land_asset_id = ${landAssets.id}
        AND gp.lifecycle_status = 'active'
        AND gp.canonical_place_id = ${listings.canonicalPlaceId}
        AND ${geographyPredicate(localities.map(locality => locality.placeId))}
    )`,
  ])) as PublicLandRow[];

  const visibleRows = await Promise.all(
    eligibleRows.map(async row => ((await isRowPublic(db, row)) ? row : null)),
  );
  const listingIdsByPlace = new Map<string, Set<number>>();
  for (const row of visibleRows) {
    if (!row?.canonicalPlaceId) continue;
    const ids = listingIdsByPlace.get(row.canonicalPlaceId) ?? new Set<number>();
    ids.add(row.listingId);
    listingIdsByPlace.set(row.canonicalPlaceId, ids);
  }

  return localities
    .flatMap(locality => {
      const listingCount = listingIdsByPlace.get(locality.placeId)?.size ?? 0;
      return listingCount > 0
        ? [{
            ...locality,
            listingCount,
            href: `/plots-and-land?canonicalPlaceId=${encodeURIComponent(locality.placeId)}`,
          }]
        : [];
    })
    .sort((left, right) => right.listingCount - left.listingCount || left.label.localeCompare(right.label));
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
    sql`EXISTS (
      SELECT 1 FROM land_asset_parcels detail_gap
      INNER JOIN land_parcels detail_parcel ON detail_gap.parcel_id = detail_parcel.id
      WHERE detail_gap.land_asset_id = ${landAssets.id}
        AND detail_parcel.lifecycle_status = 'active'
        AND detail_parcel.canonical_place_id = ${listings.canonicalPlaceId}
        AND ${listings.canonicalPlaceId} IS NOT NULL
    )`,
  ])) as PublicLandRow[];
  const row = rows[0];
  if (!row?.canonicalPlaceId) return null;
  const place = await executePlace(row.canonicalPlaceId, db);
  if (!place.ok || place.execution.scope !== 'locality') return null;
  return toPublicRow(db, row);
}
