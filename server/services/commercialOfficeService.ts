import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  agents,
  commercialAssets,
  commercialAvailabilities,
  commercialAvailabilityEconomics,
  commercialAvailabilityLeaseTerms,
  commercialAvailabilityListingLinks,
  commercialSpaceSpecifications,
  commercialSpaces,
  listingMedia,
  listings,
} from '../../drizzle/schema';
import { getDb } from '../db-connection';
import * as listingDb from '../db';
import {
  assertCommercialAvailabilityFreshness,
  assertCommercialEconomicsInput,
  assertCommercialPricingContract,
  assertCommercialSpaceAreas,
  assertCommercialSpecificationInput,
  deriveCommercialMonthlyOccupancyCost,
  type CommercialEconomicsInput,
  type CommercialPricingMode,
  type CommercialSpecificationInput,
} from '../../shared/commercial-domain';
import { verifyListingMediaUploadToken } from './listingMediaAuthority';

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
const positivePublicStates = [
  'available_confirmed',
  'available_upcoming',
  'needs_reconfirmation',
  'under_offer',
] as const;

async function database(): Promise<Database> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db as Database;
}

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const identifier = (title: string) =>
  `commercial-office-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

export function isCommercialAuthorRole(role: string | null | undefined) {
  return ['agent', 'agency_admin', 'property_developer', 'super_admin'].includes(String(role));
}

export function effectiveCommercialAvailabilityState(
  input: {
    availabilityState: string;
    reconfirmationDueAt: string | Date | null;
  },
  at = new Date(),
) {
  const due = input.reconfirmationDueAt ? new Date(input.reconfirmationDueAt) : null;
  if (
    (input.availabilityState === 'available_confirmed' ||
      input.availabilityState === 'available_upcoming') &&
    due &&
    due.getTime() < at.getTime()
  )
    return 'needs_reconfirmation' as const;
  return input.availabilityState;
}

export function availabilityPresentation(input: {
  availabilityState: string;
  occupationDate: string | null;
  confirmationSource: string | null;
  confirmationSourceLabel: string | null;
  lastConfirmedAt: string | null;
  reconfirmationDueAt: string | null;
}) {
  const state = effectiveCommercialAvailabilityState(input);
  const source = input.confirmationSourceLabel || input.confirmationSource || null;
  if (state === 'available_confirmed')
    return {
      state,
      label: 'Available — confirmed',
      source,
      confirmedAt: input.lastConfirmedAt,
      occupationDate: null,
    };
  if (state === 'available_upcoming')
    return {
      state,
      label: 'Available from',
      source,
      confirmedAt: input.lastConfirmedAt,
      occupationDate: input.occupationDate,
    };
  if (state === 'needs_reconfirmation')
    return {
      state,
      label: 'Availability needs reconfirmation',
      source,
      confirmedAt: input.lastConfirmedAt,
      occupationDate: input.occupationDate,
    };
  if (state === 'under_offer')
    return {
      state,
      label: 'Under offer',
      source,
      confirmedAt: input.lastConfirmedAt,
      occupationDate: input.occupationDate,
    };
  return {
    state,
    label: state === 'occupied' ? 'Occupied' : 'Withdrawn',
    source,
    confirmedAt: input.lastConfirmedAt,
    occupationDate: input.occupationDate,
  };
}

export function commercialCostPassport(input: {
  rentableAreaM2: number | null;
  specifications: readonly {
    specificationCode: string;
    valueState: string;
    numericValue: string | null;
  }[];
  pricingMode: CommercialPricingMode;
  economics: readonly (CommercialEconomicsInput & { vatTreatment?: string | null })[];
}) {
  assertCommercialPricingContract({ pricingMode: input.pricingMode, economics: input.economics });
  const parking = input.specifications.find(
    item => item.specificationCode === 'parking_bays' && item.valueState === 'known',
  );
  const derived = deriveCommercialMonthlyOccupancyCost({
    rentableAreaM2: input.rentableAreaM2,
    parkingBays: parking?.numericValue == null ? null : Number(parking.numericValue),
    economics: input.economics,
  });
  return { ...derived, isComplete: derived.unknownComponentCodes.length === 0 };
}

export type CreateOfficeDraftInput = {
  userId: number;
  asset:
    | {
        mode: 'new';
        name: string;
        address?: string | null;
        province: string;
        city: string;
        suburb?: string | null;
        provinceId?: number | null;
        cityId?: number | null;
        suburbId?: number | null;
      }
    | { mode: 'existing'; commercialAssetId: number };
  space: {
    identifier: string;
    rentableAreaM2: number;
    usableAreaM2?: number | null;
    floorLevel?: string | null;
  };
  availability: {
    availabilityState: 'available_confirmed' | 'available_upcoming';
    occupationDate?: string | null;
    confirmationSource:
      | 'broker'
      | 'landlord'
      | 'owner'
      | 'asset_manager'
      | 'property_fund'
      | 'other';
    confirmationSourceLabel?: string | null;
    lastConfirmedAt: string;
    reconfirmationDueAt: string;
    pricingMode: CommercialPricingMode;
    vatTreatment: 'included' | 'excluded' | 'not_applicable' | 'unknown';
  };
  economics: CommercialEconomicsInput[];
  specifications: CommercialSpecificationInput[];
  leaseTerms?: {
    minimumLeaseMonths?: number | null;
    quotedLeaseMonths?: number | null;
    annualEscalationPercent?: number | null;
    depositMinor?: number | null;
    tenantInstallationAllowanceMinor?: number | null;
    beneficialOccupationDays?: number | null;
    sourceLabel?: string | null;
    suppliedAt?: string | null;
  };
  marketing: { title: string; description: string };
};

/** Assets may only be reused by their original S1 supplier. Supplier sharing is deliberately deferred. */
export async function reusableOfficeAssetsForAuthor(userId: number) {
  const db = await database();
  return db
    .select({
      id: commercialAssets.id,
      name: commercialAssets.name,
      address: commercialAssets.address,
      provinceId: commercialAssets.provinceId,
      cityId: commercialAssets.cityId,
      suburbId: commercialAssets.suburbId,
    })
    .from(commercialAssets)
    .where(
      and(
        eq(commercialAssets.createdByUserId, userId),
        eq(commercialAssets.assetKind, 'office_building'),
        eq(commercialAssets.lifecycleStatus, 'active'),
      ),
    )
    .orderBy(commercialAssets.name);
}

export async function createOfficeDraft(input: CreateOfficeDraftInput) {
  assertCommercialSpaceAreas(input.space);
  assertCommercialAvailabilityFreshness(input.availability);
  input.specifications.forEach(assertCommercialSpecificationInput);
  input.economics.forEach(assertCommercialEconomicsInput);
  assertCommercialPricingContract({
    pricingMode: input.availability.pricingMode,
    economics: input.economics,
  });
  const db = await database();
  return db.transaction(async tx => {
    const [agent] = await tx.select().from(agents).where(eq(agents.userId, input.userId)).limit(1);
    let commercialAssetId: number;
    let listingLocation: {
      address: string | null;
      city: string;
      province: string;
      suburb: string | null;
      provinceId: number | null;
      cityId: number | null;
      suburbId: number | null;
    };
    if (input.asset.mode === 'new') {
      const assetResult = await tx.insert(commercialAssets).values({
        assetKind: 'office_building',
        name: input.asset.name.trim(),
        address: input.asset.address || null,
        provinceId: input.asset.provinceId || null,
        cityId: input.asset.cityId || null,
        suburbId: input.asset.suburbId || null,
        createdByUserId: input.userId,
      });
      commercialAssetId = Number(
        (assetResult as any)[0]?.insertId ?? (assetResult as any).insertId,
      );
      listingLocation = {
        address: input.asset.address || null,
        city: input.asset.city.trim(),
        province: input.asset.province.trim(),
        suburb: input.asset.suburb || null,
        provinceId: input.asset.provinceId || null,
        cityId: input.asset.cityId || null,
        suburbId: input.asset.suburbId || null,
      };
    } else {
      const [asset] = await tx
        .select()
        .from(commercialAssets)
        .where(
          and(
            eq(commercialAssets.id, input.asset.commercialAssetId),
            eq(commercialAssets.assetKind, 'office_building'),
            eq(commercialAssets.lifecycleStatus, 'active'),
            eq(commercialAssets.createdByUserId, input.userId),
          ),
        )
        .limit(1);
      if (!asset)
        throw new Error(
          'The selected Office building is unavailable or you are not authorised to add a space to it.',
        );
      commercialAssetId = asset.id;
      // A Listing remains marketing authority. Reuse its prior marketing geography; never trust a
      // client to overwrite an existing Asset's identity or location while adding another suite.
      const [priorMarketing] = await tx
        .select({
          city: listings.city,
          province: listings.province,
          suburb: listings.suburb,
          provinceId: listings.provinceId,
          cityId: listings.cityId,
          suburbId: listings.suburbId,
        })
        .from(commercialSpaces)
        .innerJoin(
          commercialAvailabilities,
          eq(commercialAvailabilities.commercialSpaceId, commercialSpaces.id),
        )
        .innerJoin(
          commercialAvailabilityListingLinks,
          and(
            eq(
              commercialAvailabilityListingLinks.commercialAvailabilityId,
              commercialAvailabilities.id,
            ),
            eq(commercialAvailabilityListingLinks.linkStatus, 'active'),
          ),
        )
        .innerJoin(listings, eq(listings.id, commercialAvailabilityListingLinks.listingId))
        .where(eq(commercialSpaces.commercialAssetId, asset.id))
        .orderBy(desc(listings.createdAt))
        .limit(1);
      if (!priorMarketing?.city || !priorMarketing.province)
        throw new Error(
          'The selected Office building has no reusable marketing location. Create its first space as a new building instead.',
        );
      listingLocation = {
        address: asset.address || null,
        city: priorMarketing.city,
        province: priorMarketing.province,
        suburb: priorMarketing.suburb || null,
        provinceId: priorMarketing.provinceId || asset.provinceId || null,
        cityId: priorMarketing.cityId || asset.cityId || null,
        suburbId: priorMarketing.suburbId || asset.suburbId || null,
      };
    }
    const spaceResult = await tx
      .insert(commercialSpaces)
      .values({
        commercialAssetId,
        spaceClass: 'office',
        spaceKind: 'office_suite',
        identifier: input.space.identifier.trim(),
        rentableAreaM2: String(input.space.rentableAreaM2),
        usableAreaM2: input.space.usableAreaM2 == null ? null : String(input.space.usableAreaM2),
      });
    const commercialSpaceId = Number(
      (spaceResult as any)[0]?.insertId ?? (spaceResult as any).insertId,
    );
    await tx
      .insert(commercialSpaceSpecifications)
      .values(
        input.specifications.map(specification => ({
          commercialSpaceId,
          specificationCode: specification.specificationCode,
          valueState: specification.valueState,
          numericValue:
            specification.numericValue == null ? null : String(specification.numericValue),
          textValue: specification.textValue,
          booleanValue:
            specification.booleanValue == null ? null : specification.booleanValue ? 1 : 0,
        })) as any,
      );
    const availabilityResult = await tx
      .insert(commercialAvailabilities)
      .values({
        commercialSpaceId,
        transactionType: 'lease',
        availabilityState: input.availability.availabilityState,
        occupationDate: input.availability.occupationDate || null,
        confirmationSource: input.availability.confirmationSource,
        confirmationSourceLabel: input.availability.confirmationSourceLabel || null,
        lastConfirmedAt: input.availability.lastConfirmedAt,
        reconfirmationDueAt: input.availability.reconfirmationDueAt,
        confirmedByUserId: input.userId,
        pricingMode: input.availability.pricingMode,
        vatTreatment: input.availability.vatTreatment,
      });
    const commercialAvailabilityId = Number(
      (availabilityResult as any)[0]?.insertId ?? (availabilityResult as any).insertId,
    );
    await tx
      .insert(commercialAvailabilityEconomics)
      .values(
        input.economics.map(item => ({
          commercialAvailabilityId,
          componentCode: item.componentCode as any,
          valueState: item.valueState,
          chargeBasis: item.chargeBasis,
          amountMinor: item.amountMinor,
          rangeMaximumMinor: item.rangeMaximumMinor,
          vatTreatment: input.availability.vatTreatment,
        })) as any,
      );
    if (input.leaseTerms)
      await tx
        .insert(commercialAvailabilityLeaseTerms)
        .values({
          commercialAvailabilityId,
          ...input.leaseTerms,
          annualEscalationPercent:
            input.leaseTerms.annualEscalationPercent == null
              ? null
              : String(input.leaseTerms.annualEscalationPercent),
        } as any);
    const listingResult = await tx
      .insert(listings)
      .values({
        ownerId: input.userId,
        agentId: agent?.id ?? null,
        agencyId: agent?.agencyId ?? null,
        action: 'rent',
        propertyType: 'commercial',
        title: input.marketing.title.trim(),
        description: input.marketing.description.trim(),
        address: listingLocation.address,
        city: listingLocation.city,
        province: listingLocation.province,
        suburb: listingLocation.suburb,
        provinceId: listingLocation.provinceId,
        cityId: listingLocation.cityId,
        suburbId: listingLocation.suburbId,
        status: 'draft',
        approvalStatus: 'pending',
        slug: identifier(input.marketing.title),
        propertyDetails: { commercialMarketingProjection: true },
      } as any);
    const listingId = Number(
      (listingResult as any)[0]?.insertId ?? (listingResult as any).insertId,
    );
    await tx
      .insert(commercialAvailabilityListingLinks)
      .values({ commercialAvailabilityId, listingId, linkStatus: 'active' });
    return { listingId, commercialAssetId, commercialSpaceId, commercialAvailabilityId };
  });
}

export async function submitOfficeForReview(input: { listingId: number; userId: number }) {
  const db = await database();
  const [row] = await db
    .select({
      listing: listings,
      availability: commercialAvailabilities,
      space: commercialSpaces,
      asset: commercialAssets,
    })
    .from(commercialAvailabilityListingLinks)
    .innerJoin(listings, eq(commercialAvailabilityListingLinks.listingId, listings.id))
    .innerJoin(
      commercialAvailabilities,
      eq(commercialAvailabilityListingLinks.commercialAvailabilityId, commercialAvailabilities.id),
    )
    .innerJoin(
      commercialSpaces,
      eq(commercialAvailabilities.commercialSpaceId, commercialSpaces.id),
    )
    .innerJoin(commercialAssets, eq(commercialSpaces.commercialAssetId, commercialAssets.id))
    .where(
      and(
        eq(listings.id, input.listingId),
        eq(commercialAvailabilityListingLinks.linkStatus, 'active'),
      ),
    )
    .limit(1);
  if (
    !row ||
    row.listing.ownerId !== input.userId ||
    row.space.spaceClass !== 'office' ||
    row.availability.transactionType !== 'lease'
  )
    throw new Error('Office marketing listing was not found or is not owned by this supplier.');
  const media = await db
    .select({ id: listingMedia.id })
    .from(listingMedia)
    .where(eq(listingMedia.listingId, input.listingId))
    .limit(1);
  if (!media.length)
    throw new Error('Add at least one confirmed marketing medium before submitting.');
  await listingDb.submitListingForReview(input.listingId, db);
  return { success: true };
}

/** Persists a confirmed existing Listing-media upload; it never touches Commercial inventory. */
export async function attachOfficeMarketingMedia(input: {
  listingId: number;
  userId: number;
  uploadToken: string;
}) {
  const db = await database();
  const [listing] = await db
    .select({ ownerId: listings.ownerId })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);
  if (!listing || listing.ownerId !== input.userId)
    throw new Error('Office marketing listing was not found or is not owned by this supplier.');
  const [link] = await db
    .select({ id: commercialAvailabilityListingLinks.id })
    .from(commercialAvailabilityListingLinks)
    .where(
      and(
        eq(commercialAvailabilityListingLinks.listingId, input.listingId),
        eq(commercialAvailabilityListingLinks.linkStatus, 'active'),
      ),
    )
    .limit(1);
  if (!link)
    throw new Error('Marketing media can only be attached to a linked Commercial Office listing.');
  const media = verifyListingMediaUploadToken(input.uploadToken, {
    userId: input.userId,
    listingId: input.listingId,
    requireConfirmed: true,
  });
  const result = await db
    .insert(listingMedia)
    .values({
      listingId: input.listingId,
      mediaType: media.mediaType,
      originalUrl: media.key,
      originalFileName: media.fileName,
      originalFileSize: media.fileSize,
      processedUrl: media.key,
      mimeType: media.contentType,
      processingStatus: 'completed',
      isPrimary: 0,
    });
  return { mediaId: Number((result as any)[0]?.insertId ?? (result as any).insertId) };
}

type SearchInput = {
  location?: string;
  minAreaM2?: number;
  maxAreaM2?: number;
  maxMonthlyBudgetMinor?: number;
  availability?: 'now' | 'future';
  fitOutCondition?: string;
  backupPower?: boolean;
  backupWater?: boolean;
  fibreConnectivity?: boolean;
  minParkingBays?: number;
};

async function publicOfficeRows() {
  const db = await database();
  return db
    .select({
      listing: listings,
      availability: commercialAvailabilities,
      space: commercialSpaces,
      asset: commercialAssets,
    })
    .from(commercialAvailabilityListingLinks)
    .innerJoin(listings, eq(commercialAvailabilityListingLinks.listingId, listings.id))
    .innerJoin(
      commercialAvailabilities,
      eq(commercialAvailabilityListingLinks.commercialAvailabilityId, commercialAvailabilities.id),
    )
    .innerJoin(
      commercialSpaces,
      eq(commercialAvailabilities.commercialSpaceId, commercialSpaces.id),
    )
    .innerJoin(commercialAssets, eq(commercialSpaces.commercialAssetId, commercialAssets.id))
    .where(
      and(
        eq(commercialAvailabilityListingLinks.linkStatus, 'active'),
        eq(commercialSpaces.spaceClass, 'office'),
        eq(commercialAvailabilities.transactionType, 'lease'),
        inArray(commercialAvailabilities.availabilityState, positivePublicStates),
        inArray(listings.status, ['approved', 'published']),
        eq(listings.approvalStatus, 'approved'),
      ),
    )
    .orderBy(desc(listings.publishedAt), desc(listings.createdAt));
}

async function publicOfficeDto(row: any) {
  const db = await database();
  const [specifications, economics, leaseTerms, media] = await Promise.all([
    db
      .select()
      .from(commercialSpaceSpecifications)
      .where(eq(commercialSpaceSpecifications.commercialSpaceId, row.space.id)),
    db
      .select()
      .from(commercialAvailabilityEconomics)
      .where(eq(commercialAvailabilityEconomics.commercialAvailabilityId, row.availability.id)),
    db
      .select()
      .from(commercialAvailabilityLeaseTerms)
      .where(eq(commercialAvailabilityLeaseTerms.commercialAvailabilityId, row.availability.id))
      .limit(1),
    db
      .select({
        id: listingMedia.id,
        url: listingMedia.processedUrl,
        thumbnailUrl: listingMedia.thumbnailUrl,
        mediaType: listingMedia.mediaType,
      })
      .from(listingMedia)
      .where(eq(listingMedia.listingId, row.listing.id)),
  ]);
  const passport = commercialCostPassport({
    rentableAreaM2: row.space.rentableAreaM2 == null ? null : Number(row.space.rentableAreaM2),
    specifications: specifications as any,
    pricingMode: row.availability.pricingMode as CommercialPricingMode,
    economics: economics.map(item => ({
      componentCode: item.componentCode,
      valueState: item.valueState,
      chargeBasis: item.chargeBasis,
      amountMinor: item.amountMinor,
      rangeMaximumMinor: item.rangeMaximumMinor,
    })) as any,
  });
  const quoted =
    economics.find(
      item =>
        item.componentCode ===
        (row.availability.pricingMode === 'gross_quote' ? 'gross_rent' : 'base_rent'),
    ) || null;
  return {
    listingId: row.listing.id,
    slug: row.listing.slug,
    href: `/commercial/${row.listing.slug}`,
    title: row.listing.title,
    description: row.listing.description,
    asset: {
      id: row.asset.id,
      name: row.asset.name,
      address: row.asset.address,
      city: row.listing.city,
      suburb: row.listing.suburb,
      province: row.listing.province,
    },
    space: {
      id: row.space.id,
      identifier: row.space.identifier,
      rentableAreaM2: row.space.rentableAreaM2,
      usableAreaM2: row.space.usableAreaM2,
    },
    availability: { id: row.availability.id, ...availabilityPresentation(row.availability) },
    pricing: {
      mode: row.availability.pricingMode,
      vatTreatment: row.availability.vatTreatment,
      quotedRent: quoted
        ? {
            valueState: quoted.valueState,
            chargeBasis: quoted.chargeBasis,
            amountMinor: quoted.amountMinor,
            rangeMaximumMinor: quoted.rangeMaximumMinor,
          }
        : null,
    },
    costPassport: passport,
    economics: economics.map(item => ({
      componentCode: item.componentCode,
      valueState: item.valueState,
      chargeBasis: item.chargeBasis,
      amountMinor: item.amountMinor,
      rangeMaximumMinor: item.rangeMaximumMinor,
      vatTreatment: item.vatTreatment,
    })),
    leaseTerms: leaseTerms[0] || null,
    specifications,
    media,
  };
}

export async function searchPublicOffice(input: SearchInput = {}) {
  const rows = await publicOfficeRows();
  const dtos = await Promise.all(rows.map(publicOfficeDto));
  return dtos.filter(item => {
    const location =
      `${item.asset.name} ${item.asset.address || ''} ${item.asset.city || ''} ${item.asset.suburb || ''} ${item.asset.province || ''}`.toLowerCase();
    const area = Number(item.space.rentableAreaM2 || 0);
    const specs = new Map<string, any>(
      item.specifications.map((s: any) => [s.specificationCode, s]),
    );
    if (input.location && !location.includes(input.location.toLowerCase())) return false;
    if (input.minAreaM2 != null && area < input.minAreaM2) return false;
    if (input.maxAreaM2 != null && area > input.maxAreaM2) return false;
    if (input.availability === 'now' && item.availability.state !== 'available_confirmed')
      return false;
    if (input.availability === 'future' && item.availability.state !== 'available_upcoming')
      return false;
    if (
      input.fitOutCondition &&
      specs.get('fit_out_condition')?.textValue !== input.fitOutCondition
    )
      return false;
    if (input.backupPower && specs.get('backup_power')?.booleanValue !== 1) return false;
    if (input.backupWater && specs.get('backup_water')?.booleanValue !== 1) return false;
    if (input.fibreConnectivity && specs.get('fibre_connectivity')?.booleanValue !== 1)
      return false;
    if (
      input.minParkingBays != null &&
      Number(specs.get('parking_bays')?.numericValue || 0) < input.minParkingBays
    )
      return false;
    // Conservative budget truth: incomplete Cost Passports never pass an estimated-total budget filter.
    if (
      input.maxMonthlyBudgetMinor != null &&
      (!item.costPassport.isComplete ||
        item.costPassport.monthlyMaximumMinor > input.maxMonthlyBudgetMinor)
    )
      return false;
    return true;
  });
}

export async function publicOfficeDetail(slug: string) {
  return (await searchPublicOffice()).find(item => item.slug === slug) || null;
}

export async function resolvePublicCommercialOfficeLeadCustody(input: {
  listingId: number;
  commercialAvailabilityId: number;
}) {
  const detail = (await searchPublicOffice()).find(
    item =>
      item.listingId === input.listingId && item.availability.id === input.commercialAvailabilityId,
  );
  if (!detail) return null;
  const db = await database();
  const [listing] = await db
    .select({ agentId: listings.agentId, agencyId: listings.agencyId })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);
  return {
    listingId: input.listingId,
    commercialAssetId: detail.asset.id,
    commercialSpaceId: detail.space.id,
    commercialAvailabilityId: detail.availability.id,
    agentId: listing?.agentId ?? null,
    agencyId: listing?.agencyId ?? null,
  };
}
