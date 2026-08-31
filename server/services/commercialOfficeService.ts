import { and, desc, eq, gte, inArray, lte, or } from 'drizzle-orm';
import {
  agents,
  agencies,
  commercialAssets,
  commercialAvailabilities,
  commercialAvailabilityEconomics,
  commercialAvailabilityLeaseTerms,
  commercialAvailabilityListingLinks,
  commercialSpaceSpecifications,
  commercialSpaces,
  listingMedia,
  listings,
  users,
} from '../../drizzle/schema';
import { parseCanonicalLocationId } from '../../shared/locationAuthority';
import { getDb } from '../db-connection';
import * as listingDb from '../db';
import {
  assertCommercialSpaceIdentity,
  assertCommercialAvailabilityFreshness,
  assertCommercialEconomicsInput,
  assertCommercialPricingContract,
  assertCommercialSpaceAreas,
  assertCommercialSpecificationInput,
  commercialUseTypeDefinition,
  deriveCommercialMonthlyOccupancyCost,
  isCommercialConfirmationSource,
  isCommercialMarketingPropertyType,
  isCommercialNonpublicAvailabilityState,
  isCommercialSpaceClass,
  COMMERCIAL_CONFIRMATION_SOURCE_LABELS,
  COMMERCIAL_SPACE_CLASSES,
  type CommercialAssetKind,
  type CommercialConfirmationSource,
  type CommercialEconomicsInput,
  type CommercialNonpublicAvailabilityState,
  type CommercialPricingMode,
  type CommercialSpaceClass,
  type CommercialSpaceKind,
  type CommercialSpecificationInput,
} from '../../shared/commercial-domain';
import { verifyListingMediaUploadToken } from './listingMediaAuthority';
import { toMySqlDateTime } from './leadDeliveryService';
import { resolveCanonicalListingLocation } from './listingLocationResolver';
import { locationResolver } from './locationResolverService';
import type { PrivateAddress } from '../../shared/location-contract';
import {
  getListingMediaType,
  getListingMediaUrl,
  isCompletedListingMedia,
} from '../../shared/listing-media';
import { resolveMediaDeliveryUrl } from '../_core/mediaStorage';

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
const publicCandidateStates = ['available_confirmed', 'available_upcoming'] as const;

async function database(): Promise<Database> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db as Database;
}

const identifier = (title: string) =>
  `commercial-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

export function isCommercialAuthorRole(role: string | null | undefined) {
  return ['agent', 'agency_admin'].includes(String(role));
}

export type CommercialListingSupplierCustody = { agentId: number | null; agencyId: number | null };
export type CommercialManagementScope =
  | { kind: 'supplier'; userId: number }
  | { kind: 'agency_principal'; userId: number; agencyId: number };

/**
 * Commercial custody is materialized on the linked marketing Listing. Agents
 * can manage their own supply; an agency principal can manage supply already
 * carried by that same canonical agency. No later membership inference is
 * used to widen an ordinary agent's authority.
 */
export function canManageCommercialMarketingListing(
  scope: CommercialManagementScope,
  listing: { ownerId: number | null; agencyId: number | null },
): boolean {
  if (Number(listing.ownerId) === scope.userId) return true;
  return scope.kind === 'agency_principal' && Number(listing.agencyId) === scope.agencyId;
}

/**
 * Media remains Listing-engine presentation data, but its mutation authority
 * follows the linked Commercial marketing Listing. This keeps an agency
 * principal's inventory custody consistent across reconfirmation, review
 * preparation and media attachment without granting access to an unlinked
 * generic Listing.
 */
export function canManageCommercialMarketingMedia(
  scope: CommercialManagementScope,
  listing: { ownerId: number | null; agencyId: number | null; propertyType: unknown },
  hasActiveCommercialLink: boolean,
): boolean {
  return (
    hasActiveCommercialLink &&
    isCommercialMarketingPropertyType(listing.propertyType) &&
    canManageCommercialMarketingListing(scope, listing)
  );
}

/**
 * A published Listing may outlive an agent's later profile edits.  If both
 * sides still claim an agency, the claims must agree before an enquiry can be
 * handed off; a mismatch is an authority break, not a reason to choose one
 * side or fall back to the other recipient.
 */
export function isCommercialRecipientAssociationCoherent(input: {
  listingAgencyId: number | null | undefined;
  agentAgencyId: number | null | undefined;
}): boolean {
  const normalizeAgencyId = (value: unknown): number | null | 'invalid' => {
    // Null/zero is how the legacy Listing Engine represents an unassigned
    // agency. Any other value must still be a real positive integer; treating
    // NaN or a boolean as "missing" would turn a corrupt recipient row into a
    // successful handoff.
    if (value === null || value === undefined || value === 0 || value === '0') return null;
    if (typeof value === 'string' && !value.trim()) return null;
    if (typeof value !== 'number' && typeof value !== 'string') return 'invalid';
    const normalized = Number(value);
    if (!Number.isSafeInteger(normalized) || normalized <= 0) return 'invalid';
    return normalized;
  };
  const listingAgencyId = normalizeAgencyId(input.listingAgencyId);
  const agentAgencyId = normalizeAgencyId(input.agentAgencyId);
  if (listingAgencyId === 'invalid' || agentAgencyId === 'invalid') return false;
  return listingAgencyId === null || agentAgencyId === null || listingAgencyId === agentAgencyId;
}

async function resolveCommercialManagementScope(
  db: Database,
  userId: number,
): Promise<CommercialManagementScope> {
  const [user] = await db
    .select({ role: users.role, agencyId: users.agencyId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || !isCommercialAuthorRole(user.role)) {
    throw new Error('Commercial management requires an authorised supplier.');
  }
  if (user.role !== 'agency_admin') return { kind: 'supplier', userId };
  if (!user.agencyId) {
    throw new Error('Commercial agency management requires a canonical agency.');
  }
  const [agency] = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(eq(agencies.id, user.agencyId))
    .limit(1);
  if (!agency) {
    throw new Error('Commercial supplier agency is not an active canonical authority.');
  }
  return { kind: 'agency_principal', userId, agencyId: Number(user.agencyId) };
}

function commercialInventoryScopeCondition(scope: CommercialManagementScope) {
  if (scope.kind === 'agency_principal') {
    return or(eq(listings.ownerId, scope.userId), eq(listings.agencyId, scope.agencyId))!;
  }
  return eq(listings.ownerId, scope.userId);
}

/**
 * Listing custody is materialized when Commercial marketing is authored. Public
 * enquiries must never re-resolve the author's later agency membership.
 */
export function deriveCommercialListingSupplierCustody(input: {
  user: { role: string | null; agencyId: number | null };
  agent: { id: number; agencyId: number | null; status: string } | null;
  agencyExists: boolean;
}): CommercialListingSupplierCustody {
  const ownerAgencyId = input.user.agencyId;
  const agentAgencyId = input.agent?.agencyId ?? null;
  if (ownerAgencyId && agentAgencyId && ownerAgencyId !== agentAgencyId) {
    throw new Error('Commercial supplier and Agent profile belong to different agencies.');
  }
  const agencyId = ownerAgencyId || agentAgencyId || null;
  if (agencyId && !input.agencyExists) {
    throw new Error('Commercial supplier agency is not an active canonical authority.');
  }
  if (input.agent) {
    if (input.agent.status !== 'approved') {
      throw new Error('Commercial authoring requires an approved Agent profile.');
    }
    return { agentId: input.agent.id, agencyId };
  }
  if (input.user.role === 'agency_admin' && agencyId) {
    return { agentId: null, agencyId };
  }
  throw new Error(
    'Commercial authoring requires a canonical Agent or agency-principal enquiry recipient.',
  );
}

async function resolveCommercialListingSupplierCustody(
  tx: Database,
  userId: number,
): Promise<CommercialListingSupplierCustody> {
  const [user] = await tx
    .select({ role: users.role, agencyId: users.agencyId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new Error('Commercial supplier identity was not found.');
  const [agent] = await tx
    .select({ id: agents.id, agencyId: agents.agencyId, status: agents.status })
    .from(agents)
    .where(eq(agents.userId, userId))
    .limit(1);
  const agencyId = user.agencyId || agent?.agencyId || null;
  const [agency] = agencyId
    ? await tx.select({ id: agencies.id }).from(agencies).where(eq(agencies.id, agencyId)).limit(1)
    : [null];
  return deriveCommercialListingSupplierCustody({
    user: { role: user.role, agencyId: user.agencyId },
    agent: agent || null,
    agencyExists: agencyId ? Boolean(agency) : true,
  });
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
    (!due || !Number.isFinite(due.getTime()) || due.getTime() < at.getTime())
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
  const confirmationSource = isCommercialConfirmationSource(input.confirmationSource)
    ? input.confirmationSource
    : null;
  const confirmationSourceLabel = input.confirmationSourceLabel?.trim() || null;
  // Never echo an ungoverned value as public provenance.  The raw enum is
  // intentionally discarded when it is outside the controlled vocabulary;
  // `Other` must carry its explicit, author-supplied label instead.
  const source =
    confirmationSource === null
      ? null
      : confirmationSourceLabel ||
        (confirmationSource ? COMMERCIAL_CONFIRMATION_SOURCE_LABELS[confirmationSource] : null) ||
        null;
  const provenance = {
    source,
    confirmationSource,
    confirmationSourceLabel,
    reconfirmationDueAt: input.reconfirmationDueAt,
  };
  if (state === 'available_confirmed')
    return {
      state,
      label: 'Available — confirmed',
      ...provenance,
      confirmedAt: input.lastConfirmedAt,
      occupationDate: null,
    };
  if (state === 'available_upcoming')
    return {
      state,
      label: 'Available from',
      ...provenance,
      confirmedAt: input.lastConfirmedAt,
      occupationDate: input.occupationDate,
    };
  if (state === 'needs_reconfirmation')
    return {
      state,
      label: 'Availability needs reconfirmation',
      ...provenance,
      confirmedAt: input.lastConfirmedAt,
      occupationDate: input.occupationDate,
    };
  if (state === 'under_offer')
    return {
      state,
      label: 'Under offer',
      ...provenance,
      confirmedAt: input.lastConfirmedAt,
      occupationDate: input.occupationDate,
    };
  return {
    state,
    label: state === 'occupied' ? 'Occupied' : 'Withdrawn',
    ...provenance,
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

export type CreateCommercialDraftInput = {
  userId: number;
  asset:
    | {
        mode: 'new';
        assetKind: CommercialAssetKind;
        name: string;
        provinceId: number;
        cityId: number;
        suburbId?: number | null;
        privateAddress: PrivateAddress;
        coordinateSource: 'autocomplete' | 'map' | 'manual_confirmed';
        latitude?: number | null;
        longitude?: number | null;
        providerLocationPlaceId?: string | null;
        publicLocationPrecision?: 'approximate' | 'exact';
        confirmPhysicalLocation: true;
      }
    | { mode: 'existing'; commercialAssetId: number };
  space: {
    spaceClass: CommercialSpaceClass;
    spaceKind: CommercialSpaceKind;
    identifier: string;
    rentableAreaM2: number;
    usableAreaM2?: number | null;
  };
  availability: {
    availabilityState: 'available_confirmed' | 'available_upcoming';
    occupationDate?: string | null;
    confirmationSource: CommercialConfirmationSource;
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

type CanonicalCommercialLocation = {
  provinceId: number;
  cityId: number;
  suburbId: number | null;
  province: string;
  city: string;
  suburb: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  providerLocationPlaceId: string | null;
  coordinateSource: 'autocomplete' | 'map' | 'manual_confirmed' | null;
  privateAddress: PrivateAddress | null;
  locationConfirmationState: 'confirmed' | 'needs_confirmation';
  publicLocationPrecision: 'approximate' | 'exact';
};

async function resolveRequiredCommercialLocation(input: {
  provinceId: number | null | undefined;
  cityId: number | null | undefined;
  suburbId?: number | null;
  privateAddress?: PrivateAddress | null;
  coordinateSource?: 'autocomplete' | 'map' | 'manual_confirmed' | null;
  latitude?: number | null;
  longitude?: number | null;
  providerLocationPlaceId?: string | null;
  locationConfirmationState?: 'confirmed' | 'needs_confirmation';
  publicLocationPrecision?: 'approximate' | 'exact';
}): Promise<CanonicalCommercialLocation> {
  const resolved = await resolveCanonicalListingLocation({
    provinceId: input.provinceId,
    cityId: input.cityId,
    suburbId: input.suburbId || null,
    privateAddress: input.privateAddress || null,
    coordinateSource: input.coordinateSource || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    providerLocationPlaceId: input.providerLocationPlaceId || null,
    locationConfirmationState: input.locationConfirmationState || 'needs_confirmation',
    publicLocationPrecision: input.publicLocationPrecision || 'approximate',
    propertyType: 'commercial',
  });
  if (!resolved.provinceId || !resolved.cityId || !resolved.province || !resolved.city) {
    throw new Error('Select a valid canonical Province and City for this Commercial asset.');
  }
  return {
    provinceId: resolved.provinceId,
    cityId: resolved.cityId,
    suburbId: resolved.suburbId || null,
    province: resolved.province,
    city: resolved.city,
    suburb: resolved.suburb || null,
    address: resolved.address,
    latitude: resolved.coordinatePair?.latitude ?? null,
    longitude: resolved.coordinatePair?.longitude ?? null,
    providerLocationPlaceId: resolved.providerLocationPlaceId,
    coordinateSource: resolved.coordinateSource,
    privateAddress: resolved.privateAddress,
    locationConfirmationState: resolved.locationConfirmationState,
    publicLocationPrecision: resolved.publicLocationPrecision,
  };
}

/** Assets may only be reused by their original supplier. Supplier sharing is deliberately deferred. */
export async function reusableCommercialAssetsForAuthor(
  userId: number,
  spaceClass: CommercialSpaceClass,
) {
  const db = await database();
  const candidates = await db
    .select({
      id: commercialAssets.id,
      assetKind: commercialAssets.assetKind,
      name: commercialAssets.name,
      address: commercialAssets.address,
      provinceId: commercialAssets.provinceId,
      cityId: commercialAssets.cityId,
      suburbId: commercialAssets.suburbId,
      privateAddress: commercialAssets.privateAddress,
      latitude: commercialAssets.latitude,
      longitude: commercialAssets.longitude,
      providerLocationPlaceId: commercialAssets.providerLocationPlaceId,
      coordinateSource: commercialAssets.coordinateSource,
      locationConfirmationState: commercialAssets.locationConfirmationState,
      publicLocationPrecision: commercialAssets.publicLocationPrecision,
    })
    .from(commercialAssets)
    .where(
      and(
        eq(commercialAssets.createdByUserId, userId),
        eq(commercialAssets.lifecycleStatus, 'active'),
      ),
    )
    .orderBy(commercialAssets.name);
  const reusable = await Promise.all(
    candidates.map(async asset => {
      try {
        const location = await resolveRequiredCommercialLocation(asset);
        const acceptsAsset = commercialUseTypeDefinition(spaceClass).assetKinds.includes(
          asset.assetKind as CommercialAssetKind,
        );
        return location.locationConfirmationState === 'confirmed' && acceptsAsset
          ? { ...asset, location }
          : null;
      } catch {
        return null;
      }
    }),
  );
  return reusable.filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
}

export async function createCommercialDraft(input: CreateCommercialDraftInput) {
  const confirmationSourceLabel = input.availability.confirmationSourceLabel?.trim() || null;
  assertCommercialSpaceAreas(input.space);
  if (
    input.space.rentableAreaM2 == null ||
    !Number.isFinite(Number(input.space.rentableAreaM2)) ||
    Number(input.space.rentableAreaM2) <= 0
  ) {
    throw new Error('Commercial authoring requires a positive rentable area.');
  }
  if (!input.marketing.title?.trim() || !input.marketing.description?.trim()) {
    throw new Error('Commercial marketing requires a title and description.');
  }
  assertCommercialAvailabilityFreshness({
    ...input.availability,
    confirmationSourceLabel,
  });
  input.specifications.forEach(assertCommercialSpecificationInput);
  input.economics.forEach(assertCommercialEconomicsInput);
  assertCommercialPricingContract({
    pricingMode: input.availability.pricingMode,
    economics: input.economics,
  });
  const db = await database();
  return db.transaction(async tx => {
    const supplierCustody = await resolveCommercialListingSupplierCustody(
      tx as Database,
      input.userId,
    );
    let commercialAssetId: number;
    let listingLocation: {
      address: string | null;
      city: string;
      province: string;
      suburb: string | null;
      provinceId: number | null;
      cityId: number | null;
      suburbId: number | null;
      privateAddress: PrivateAddress | null;
      latitude: number | null;
      longitude: number | null;
      providerLocationPlaceId: string | null;
      coordinateSource: 'autocomplete' | 'map' | 'manual_confirmed' | null;
      locationConfirmationState: 'confirmed' | 'needs_confirmation';
      publicLocationPrecision: 'approximate' | 'exact';
    };
    if (input.asset.mode === 'new') {
      assertCommercialSpaceIdentity({
        spaceClass: input.space.spaceClass,
        spaceKind: input.space.spaceKind,
        assetKind: input.asset.assetKind,
      });
      if (input.asset.confirmPhysicalLocation !== true) {
        throw new Error('Explicit supplier physical-location confirmation is required.');
      }
      const location = await resolveRequiredCommercialLocation({
        ...input.asset,
        locationConfirmationState: 'confirmed',
      });
      if (location.locationConfirmationState !== 'confirmed') {
        throw new Error(
          'Confirm the Commercial asset’s physical location before creating a publish-ready space.',
        );
      }
      const assetResult = await tx.insert(commercialAssets).values({
        assetKind: input.asset.assetKind,
        name: input.asset.name.trim(),
        address: location.address,
        provinceId: location.provinceId,
        cityId: location.cityId,
        suburbId: location.suburbId,
        privateAddress: location.privateAddress,
        latitude: location.latitude == null ? null : String(location.latitude),
        longitude: location.longitude == null ? null : String(location.longitude),
        providerLocationPlaceId: location.providerLocationPlaceId,
        coordinateSource: location.coordinateSource,
        locationConfirmationState: location.locationConfirmationState,
        publicLocationPrecision: location.publicLocationPrecision,
        locationConfirmedByUserId: input.userId,
        locationConfirmedAt: toMySqlDateTime(),
        createdByUserId: input.userId,
      });
      commercialAssetId = Number(
        (assetResult as any)[0]?.insertId ?? (assetResult as any).insertId,
      );
      listingLocation = {
        address: location.address,
        city: location.city,
        province: location.province,
        suburb: location.suburb,
        provinceId: location.provinceId,
        cityId: location.cityId,
        suburbId: location.suburbId,
        privateAddress: location.privateAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        providerLocationPlaceId: location.providerLocationPlaceId,
        coordinateSource: location.coordinateSource,
        locationConfirmationState: location.locationConfirmationState,
        publicLocationPrecision: location.publicLocationPrecision,
      };
    } else {
      const [asset] = await tx
        .select()
        .from(commercialAssets)
        .where(
          and(
            eq(commercialAssets.id, input.asset.commercialAssetId),
            eq(commercialAssets.lifecycleStatus, 'active'),
            eq(commercialAssets.createdByUserId, input.userId),
          ),
        )
        .limit(1);
      if (!asset)
        throw new Error(
          'The selected Commercial asset is unavailable or you are not authorised to add a space to it.',
        );
      assertCommercialSpaceIdentity({
        spaceClass: input.space.spaceClass,
        spaceKind: input.space.spaceKind,
        assetKind: asset.assetKind as CommercialAssetKind,
      });
      commercialAssetId = asset.id;
      const location = await resolveRequiredCommercialLocation(asset);
      if (location.locationConfirmationState !== 'confirmed') {
        throw new Error(
          'The selected Commercial asset requires physical-location confirmation before another space can be marketed.',
        );
      }
      listingLocation = {
        address: location.address,
        city: location.city,
        province: location.province,
        suburb: location.suburb,
        provinceId: location.provinceId,
        cityId: location.cityId,
        suburbId: location.suburbId,
        privateAddress: location.privateAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        providerLocationPlaceId: location.providerLocationPlaceId,
        coordinateSource: location.coordinateSource,
        locationConfirmationState: location.locationConfirmationState,
        publicLocationPrecision: location.publicLocationPrecision,
      };
    }
    const spaceResult = await tx.insert(commercialSpaces).values({
      commercialAssetId,
      spaceClass: input.space.spaceClass,
      spaceKind: input.space.spaceKind,
      identifier: input.space.identifier.trim(),
      rentableAreaM2: String(input.space.rentableAreaM2),
      usableAreaM2: input.space.usableAreaM2 == null ? null : String(input.space.usableAreaM2),
    });
    const commercialSpaceId = Number(
      (spaceResult as any)[0]?.insertId ?? (spaceResult as any).insertId,
    );
    await tx.insert(commercialSpaceSpecifications).values(
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
    const availabilityResult = await tx.insert(commercialAvailabilities).values({
      commercialSpaceId,
      transactionType: 'lease',
      availabilityState: input.availability.availabilityState,
      occupationDate: input.availability.occupationDate || null,
      confirmationSource: input.availability.confirmationSource,
      confirmationSourceLabel,
      lastConfirmedAt: toMySqlDateTime(input.availability.lastConfirmedAt),
      reconfirmationDueAt: toMySqlDateTime(input.availability.reconfirmationDueAt),
      confirmedByUserId: input.userId,
      pricingMode: input.availability.pricingMode,
      vatTreatment: input.availability.vatTreatment,
    });
    const commercialAvailabilityId = Number(
      (availabilityResult as any)[0]?.insertId ?? (availabilityResult as any).insertId,
    );
    await tx.insert(commercialAvailabilityEconomics).values(
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
      await tx.insert(commercialAvailabilityLeaseTerms).values({
        commercialAvailabilityId,
        ...input.leaseTerms,
        suppliedAt: input.leaseTerms.suppliedAt
          ? toMySqlDateTime(input.leaseTerms.suppliedAt)
          : null,
        annualEscalationPercent:
          input.leaseTerms.annualEscalationPercent == null
            ? null
            : String(input.leaseTerms.annualEscalationPercent),
      } as any);
    const listingResult = await tx.insert(listings).values({
      ownerId: input.userId,
      agentId: supplierCustody.agentId,
      agencyId: supplierCustody.agencyId,
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
      privateAddress: listingLocation.privateAddress,
      latitude: listingLocation.latitude == null ? null : String(listingLocation.latitude),
      longitude: listingLocation.longitude == null ? null : String(listingLocation.longitude),
      placeId: listingLocation.providerLocationPlaceId,
      coordinateSource: listingLocation.coordinateSource,
      locationConfirmationState: listingLocation.locationConfirmationState,
      publicLocationPrecision: listingLocation.publicLocationPrecision,
      status: 'draft',
      approvalStatus: 'pending',
      slug: identifier(input.marketing.title),
      // Keep the Listing Engine's transport marker for legacy presentation
      // tooling. It is never used as Commercial identity or availability
      // authority; the canonical link above remains the source of truth.
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

export async function submitCommercialForReview(input: { listingId: number; userId: number }) {
  const db = await database();
  const scope = await resolveCommercialManagementScope(db, input.userId);
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
        eq(listings.propertyType, 'commercial'),
        eq(commercialAvailabilityListingLinks.linkStatus, 'active'),
      ),
    )
    .limit(1);
  if (
    !row ||
    !canManageCommercialMarketingListing(scope, row.listing) ||
    row.listing.action !== 'rent' ||
    row.asset.lifecycleStatus !== 'active' ||
    row.asset.locationConfirmationState !== 'confirmed' ||
    row.space.lifecycleStatus !== 'active' ||
    !isCommercialSpaceClass(row.space.spaceClass) ||
    row.availability.transactionType !== 'lease' ||
    !isPublicCommercialAvailabilityDiscoverable({
      state: effectiveCommercialAvailabilityState(row.availability),
      reconfirmationDueAt: row.availability.reconfirmationDueAt,
      confirmationSource: row.availability.confirmationSource,
      confirmedAt: row.availability.lastConfirmedAt,
      occupationDate: row.availability.occupationDate,
    })
  )
    throw new Error('Commercial marketing listing was not found or is not owned by this supplier.');
  assertCommercialAvailabilityFreshness(row.availability as any);
  assertCommercialSpaceAreas({
    rentableAreaM2: row.space.rentableAreaM2 == null ? null : Number(row.space.rentableAreaM2),
    usableAreaM2: row.space.usableAreaM2 == null ? null : Number(row.space.usableAreaM2),
  });
  if (row.space.rentableAreaM2 == null || Number(row.space.rentableAreaM2) <= 0) {
    throw new Error('Commercial submission requires a positive rentable area.');
  }
  const media = await db
    .select({
      mediaType: listingMedia.mediaType,
      originalUrl: listingMedia.originalUrl,
      processedUrl: listingMedia.processedUrl,
      previewUrl: listingMedia.previewUrl,
      thumbnailUrl: listingMedia.thumbnailUrl,
      processingStatus: listingMedia.processingStatus,
    })
    .from(listingMedia)
    .where(eq(listingMedia.listingId, input.listingId));
  if (commercialMarketingMediaSummary(media).completedMediaCount === 0)
    throw new Error('Add at least one confirmed marketing medium before submitting.');
  const economics = await db
    .select()
    .from(commercialAvailabilityEconomics)
    .where(eq(commercialAvailabilityEconomics.commercialAvailabilityId, row.availability.id));
  assertCommercialPricingContract({
    pricingMode: row.availability.pricingMode as CommercialPricingMode,
    economics: economics.map(item => ({
      componentCode: item.componentCode,
      valueState: item.valueState,
      chargeBasis: item.chargeBasis,
      amountMinor: item.amountMinor,
      rangeMaximumMinor: item.rangeMaximumMinor,
    })) as any,
  });
  const specifications = await db
    .select()
    .from(commercialSpaceSpecifications)
    .where(eq(commercialSpaceSpecifications.commercialSpaceId, row.space.id));
  specifications.forEach(item =>
    assertCommercialSpecificationInput({
      specificationCode: item.specificationCode,
      valueState: item.valueState,
      numericValue: item.numericValue == null ? null : Number(item.numericValue),
      textValue: item.textValue,
      booleanValue: item.booleanValue == null ? null : Number(item.booleanValue) === 1,
    }),
  );
  await listingDb.submitListingForReview(input.listingId, db);
  return { success: true };
}

/**
 * Preserve a deterministic gallery order and a real primary image while
 * Commercial authoring reuses the governed Listing-media store. This is pure
 * on purpose so the same decision is covered without a database fixture.
 */
export function commercialMarketingMediaPlacement(
  existingMedia: readonly {
    displayOrder?: number | null;
    mediaType?: 'image' | 'video' | 'floorplan' | 'pdf' | null;
    type?: 'image' | 'video' | 'floorplan' | 'pdf' | null;
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
    originalUrl?: string | null;
    processedUrl?: string | null;
    previewUrl?: string | null;
    thumbnailUrl?: string | null;
  }[],
  mediaType: 'image' | 'video' | 'floorplan' | 'pdf',
) {
  const displayOrder =
    existingMedia.reduce((maximum, item) => {
      const value = Number(item.displayOrder);
      return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
    }, -1) + 1;
  const hasCompletedImage = existingMedia.some(
    item =>
      getListingMediaType(item) === 'image' &&
      isCompletedListingMedia(item) &&
      Boolean(getListingMediaUrl(item)),
  );

  return {
    displayOrder,
    isPrimary: mediaType === 'image' && !hasCompletedImage ? 1 : 0,
  } as const;
}

/**
 * Marketing is reusable Listing-engine presentation data, but a Commercial
 * draft is only ready to enter review once it has at least one confirmed,
 * deliverable medium. Keep that decision in one pure helper so author
 * inventory and the submit boundary cannot drift apart.
 */
export function commercialMarketingMediaSummary(
  media: readonly {
    mediaType?: 'image' | 'video' | 'floorplan' | 'pdf' | null;
    type?: 'image' | 'video' | 'floorplan' | 'pdf' | null;
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null;
    originalUrl?: string | null;
    processedUrl?: string | null;
    previewUrl?: string | null;
    thumbnailUrl?: string | null;
  }[],
) {
  const completed = media.filter(
    item => isCompletedListingMedia(item) && Boolean(getListingMediaUrl(item)),
  );
  return {
    completedMediaCount: completed.length,
    completedImageCount: completed.filter(item => getListingMediaType(item) === 'image').length,
  };
}

async function assertCommercialMarketingMediaCustodyInDatabase(
  db: Database,
  input: { listingId: number; userId: number },
): Promise<void> {
  const scope = await resolveCommercialManagementScope(db, input.userId);
  const [listing] = await db
    .select({
      ownerId: listings.ownerId,
      agencyId: listings.agencyId,
      propertyType: listings.propertyType,
    })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);
  const [link] = listing
    ? await db
        .select({ id: commercialAvailabilityListingLinks.id })
        .from(commercialAvailabilityListingLinks)
        .where(
          and(
            eq(commercialAvailabilityListingLinks.listingId, input.listingId),
            eq(commercialAvailabilityListingLinks.linkStatus, 'active'),
          ),
        )
        .limit(1)
    : [null];

  if (!listing || !canManageCommercialMarketingMedia(scope, listing, Boolean(link))) {
    throw new Error('Commercial marketing listing was not found or is not owned by this supplier.');
  }
}

/**
 * Lets the reusable Listing-media upload reservation honour canonical
 * Commercial agency custody. The caller still obtains a user-bound token and
 * attachment rechecks this authority before persisting media.
 */
export async function assertCommercialMarketingMediaCustody(input: {
  listingId: number;
  userId: number;
}): Promise<void> {
  const db = await database();
  await assertCommercialMarketingMediaCustodyInDatabase(db, input);
}

/** Persists a confirmed existing Listing-media upload; it never touches Commercial inventory. */
export async function attachCommercialMarketingMedia(input: {
  listingId: number;
  userId: number;
  uploadToken: string;
}) {
  const db = await database();
  await assertCommercialMarketingMediaCustodyInDatabase(db, input);
  const media = verifyListingMediaUploadToken(input.uploadToken, {
    userId: input.userId,
    listingId: input.listingId,
    requireConfirmed: true,
  });
  const existingMedia = await db
    .select()
    .from(listingMedia)
    .where(eq(listingMedia.listingId, input.listingId));
  const placement = commercialMarketingMediaPlacement(existingMedia as any, media.mediaType);
  const result = await db.insert(listingMedia).values({
    listingId: input.listingId,
    mediaType: media.mediaType,
    originalUrl: media.key,
    originalFileName: media.fileName,
    originalFileSize: media.fileSize,
    processedUrl: media.key,
    mimeType: media.contentType,
    processingStatus: 'completed',
    isPrimary: placement.isPrimary,
    displayOrder: placement.displayOrder,
  });
  return { mediaId: Number((result as any)[0]?.insertId ?? (result as any).insertId) };
}

export type CommercialAvailabilityReconfirmationInput = {
  userId: number;
  commercialAvailabilityId: number;
  availabilityState: 'available_confirmed' | 'available_upcoming';
  occupationDate?: string | null;
  confirmationSource: CommercialConfirmationSource;
  confirmationSourceLabel?: string | null;
  lastConfirmedAt: string;
  reconfirmationDueAt: string;
};

/**
 * Normalizes an author-confirmed availability update before it reaches the
 * canonical Availability record. A stale row is not made public by a passive
 * read: the supplier must explicitly supply fresh provenance and timing.
 */
export function normalizeCommercialAvailabilityReconfirmation(
  input: Omit<CommercialAvailabilityReconfirmationInput, 'userId' | 'commercialAvailabilityId'>,
) {
  const confirmationSourceLabel = input.confirmationSourceLabel?.trim() || null;
  if (input.confirmationSource === 'other' && !confirmationSourceLabel) {
    throw new Error('Describe the source of the availability confirmation.');
  }
  assertCommercialAvailabilityFreshness(input);
  return {
    availabilityState: input.availabilityState,
    occupationDate: input.occupationDate || null,
    confirmationSource: input.confirmationSource,
    confirmationSourceLabel,
    lastConfirmedAt: toMySqlDateTime(input.lastConfirmedAt),
    reconfirmationDueAt: toMySqlDateTime(input.reconfirmationDueAt),
  };
}

/**
 * Reconfirmation is scoped through the canonical Listing link and ownership;
 * it never reaches a raw generic Listing price or an unrelated Availability.
 */
export async function reconfirmCommercialAvailability(
  input: CommercialAvailabilityReconfirmationInput,
) {
  const update = normalizeCommercialAvailabilityReconfirmation(input);
  const db = await database();
  const scope = await resolveCommercialManagementScope(db, input.userId);
  const [owned] = await db
    .select({
      availability: commercialAvailabilities,
      space: commercialSpaces,
      listing: { ownerId: listings.ownerId, agencyId: listings.agencyId },
    })
    .from(commercialAvailabilityListingLinks)
    .innerJoin(
      commercialAvailabilities,
      eq(commercialAvailabilityListingLinks.commercialAvailabilityId, commercialAvailabilities.id),
    )
    .innerJoin(
      commercialSpaces,
      eq(commercialAvailabilities.commercialSpaceId, commercialSpaces.id),
    )
    .innerJoin(listings, eq(commercialAvailabilityListingLinks.listingId, listings.id))
    .where(
      and(
        eq(
          commercialAvailabilityListingLinks.commercialAvailabilityId,
          input.commercialAvailabilityId,
        ),
        eq(listings.propertyType, 'commercial'),
        eq(commercialAvailabilityListingLinks.linkStatus, 'active'),
      ),
    )
    .limit(1);
  if (
    !owned ||
    !canManageCommercialMarketingListing(scope, owned.listing) ||
    !isCommercialSpaceClass(owned.space.spaceClass) ||
    owned.availability.transactionType !== 'lease'
  ) {
    throw new Error('Commercial availability was not found or is not owned by this supplier.');
  }

  await db
    .update(commercialAvailabilities)
    .set({ ...update, confirmedByUserId: input.userId })
    .where(eq(commercialAvailabilities.id, input.commercialAvailabilityId));

  return {
    commercialAvailabilityId: input.commercialAvailabilityId,
    availability: availabilityPresentation({ ...owned.availability, ...update }),
  };
}

export type CommercialAvailabilityStatusInput = {
  userId: number;
  commercialAvailabilityId: number;
  availabilityState: CommercialNonpublicAvailabilityState;
};

/**
 * A supplier can stop public discovery through the canonical Availability,
 * without deleting or archiving the reusable Listing marketing record. A
 * later reactivation must go through reconfirmation with fresh provenance.
 */
export function normalizeCommercialAvailabilityStatusUpdate(
  input: Omit<CommercialAvailabilityStatusInput, 'userId' | 'commercialAvailabilityId'>,
) {
  if (!isCommercialNonpublicAvailabilityState(input.availabilityState)) {
    throw new Error('Use a non-public Commercial availability state for this transition.');
  }
  return {
    availabilityState: input.availabilityState,
    occupationDate: null,
  } as const;
}

export async function setCommercialAvailabilityStatus(input: CommercialAvailabilityStatusInput) {
  const update = normalizeCommercialAvailabilityStatusUpdate(input);
  const db = await database();
  const scope = await resolveCommercialManagementScope(db, input.userId);
  const [owned] = await db
    .select({
      availability: commercialAvailabilities,
      space: commercialSpaces,
      listing: { ownerId: listings.ownerId, agencyId: listings.agencyId },
    })
    .from(commercialAvailabilityListingLinks)
    .innerJoin(
      commercialAvailabilities,
      eq(commercialAvailabilityListingLinks.commercialAvailabilityId, commercialAvailabilities.id),
    )
    .innerJoin(
      commercialSpaces,
      eq(commercialAvailabilities.commercialSpaceId, commercialSpaces.id),
    )
    .innerJoin(listings, eq(commercialAvailabilityListingLinks.listingId, listings.id))
    .where(
      and(
        eq(
          commercialAvailabilityListingLinks.commercialAvailabilityId,
          input.commercialAvailabilityId,
        ),
        eq(listings.propertyType, 'commercial'),
        eq(commercialAvailabilityListingLinks.linkStatus, 'active'),
      ),
    )
    .limit(1);
  if (
    !owned ||
    !canManageCommercialMarketingListing(scope, owned.listing) ||
    !isCommercialSpaceClass(owned.space.spaceClass) ||
    owned.availability.transactionType !== 'lease'
  ) {
    throw new Error('Commercial availability was not found or is not owned by this supplier.');
  }

  await db
    .update(commercialAvailabilities)
    .set(update)
    .where(eq(commercialAvailabilities.id, input.commercialAvailabilityId));

  return {
    commercialAvailabilityId: input.commercialAvailabilityId,
    availability: availabilityPresentation({ ...owned.availability, ...update }),
  };
}

/** Supplier inventory is read from Asset → Space → Availability → Listing, never from `properties`. */
export async function myCommercialInventoryForAuthor(userId: number) {
  const db = await database();
  const scope = await resolveCommercialManagementScope(db, userId);
  const rows = await db
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
        eq(listings.propertyType, 'commercial'),
        eq(commercialAssets.lifecycleStatus, 'active'),
        commercialInventoryScopeCondition(scope),
        eq(commercialAvailabilities.transactionType, 'lease'),
        inArray(commercialSpaces.spaceClass, COMMERCIAL_SPACE_CLASSES as any),
      ),
    )
    .orderBy(desc(commercialAvailabilities.updatedAt), desc(listings.updatedAt));

  const listingIds: number[] = Array.from(new Set<number>(rows.map(row => Number(row.listing.id))));
  const mediaRows = listingIds.length
    ? await db
        .select({
          listingId: listingMedia.listingId,
          mediaType: listingMedia.mediaType,
          originalUrl: listingMedia.originalUrl,
          processedUrl: listingMedia.processedUrl,
          previewUrl: listingMedia.previewUrl,
          thumbnailUrl: listingMedia.thumbnailUrl,
          processingStatus: listingMedia.processingStatus,
        })
        .from(listingMedia)
        .where(inArray(listingMedia.listingId, listingIds))
    : [];
  const mediaByListingId = new Map<number, (typeof mediaRows)[number][]>();
  for (const medium of mediaRows) {
    const listingId = Number(medium.listingId);
    const mediaForListing = mediaByListingId.get(listingId) || [];
    mediaForListing.push(medium);
    mediaByListingId.set(listingId, mediaForListing);
  }

  return rows.map(row => {
    const availability = availabilityPresentation(row.availability);
    return {
      listing: {
        id: row.listing.id,
        title: row.listing.title,
        slug: row.listing.slug,
        status: row.listing.status,
        approvalStatus: row.listing.approvalStatus,
        publishedAt: row.listing.publishedAt,
      },
      marketing: commercialMarketingMediaSummary(
        mediaByListingId.get(Number(row.listing.id)) || [],
      ),
      asset: {
        id: row.asset.id,
        name: row.asset.name,
        cityId: row.asset.cityId,
        suburbId: row.asset.suburbId,
      },
      space: {
        id: row.space.id,
        useType: row.space.spaceClass,
        kind: row.space.spaceKind,
        identifier: row.space.identifier,
        rentableAreaM2: row.space.rentableAreaM2,
      },
      availability: {
        id: row.availability.id,
        pricingMode: row.availability.pricingMode,
        vatTreatment: row.availability.vatTreatment,
        ...availability,
        isPubliclyDiscoverable:
          row.listing.status === 'published' &&
          row.listing.approvalStatus === 'approved' &&
          isPublicCommercialAvailabilityDiscoverable({
            ...availability,
            reconfirmationDueAt: row.availability.reconfirmationDueAt,
          }),
      },
    };
  });
}

export type CommercialSearchInput = {
  location?: string;
  locationIds?: string[];
  useTypes?: CommercialSpaceClass[];
  pricingMode?: CommercialPricingMode;
  minAreaM2?: number;
  maxAreaM2?: number;
  maxMonthlyBudgetMinor?: number;
  availability?: 'now' | 'future';
  fitOutCondition?: string;
  backupPower?: boolean;
  backupWater?: boolean;
  fibreConnectivity?: boolean;
  minParkingBays?: number;
  minEavesHeightM?: number;
  minPowerCapacityKva?: number;
  minLoadingDocks?: number;
  yardHardstand?: boolean;
  extractionCapability?: boolean;
};

/**
 * Canonical Commercial geography scope.
 *
 * - `none`  : no location input supplied; the search runs unscoped.
 * - `empty` : a scope was supplied but could not be resolved to canonical
 *             geography; the search fails closed to zero results instead of
 *             widening or falling back to display-text matching.
 * - `scope` : resolved canonical ids on exactly one geography level, applied
 *             as FK equality against commercial_assets.
 */
export type CommercialLocationScope =
  | { status: 'none' }
  | { status: 'empty' }
  | { status: 'scope'; field: 'provinceId' | 'cityId' | 'suburbId'; ids: number[] };

const LOCATION_LEVEL_FIELD = {
  province: 'provinceId',
  city: 'cityId',
  suburb: 'suburbId',
} as const;

function normalizeLocationSlugToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Pure classification of raw location inputs into a canonical scope request.
 * Exported for contract tests; the slug lookup itself is database-backed.
 */
export function classifyCommercialLocationScope(
  input: Pick<CommercialSearchInput, 'location' | 'locationIds'>,
):
  | { status: 'none' }
  | { status: 'slug'; token: string }
  | { status: 'ids'; level: 'province' | 'city' | 'suburb'; ids: number[] }
  | { status: 'invalid' } {
  const rawIds = (input.locationIds || []).map(value => String(value).trim()).filter(Boolean);
  const rawLocation = typeof input.location === 'string' ? input.location.trim() : '';

  // A request may have exactly one geography authority. Do not silently let
  // canonical ids override a simultaneous legacy text token: reject it so an
  // upstream handoff cannot broaden or alter the consumer's intended scope.
  if (rawIds.length && rawLocation) return { status: 'invalid' };

  if (rawIds.length) {
    const parsed = rawIds.map(value => parseCanonicalLocationId(value));
    if (parsed.some(entry => entry === null)) return { status: 'invalid' };
    const levels = new Set(parsed.map(entry => entry!.level));
    if (levels.size !== 1) return { status: 'invalid' };
    const level = parsed[0]!.level as 'province' | 'city' | 'suburb';
    const ids = Array.from(new Set(parsed.map(entry => Number(entry!.id)))).filter(
      id => Number.isSafeInteger(id) && id > 0,
    );
    if (!ids.length) return { status: 'invalid' };
    return { status: 'ids', level, ids };
  }

  if (!rawLocation) return { status: 'none' };
  const token = normalizeLocationSlugToken(rawLocation);
  return token ? { status: 'slug', token } : { status: 'none' };
}

/**
 * Resolves the classified scope into concrete asset geography ids using exact
 * canonical slug identity only. There is deliberately no substring, no
 * display-name concatenation, and no fallback widening: an unrecognized
 * location resolves to an empty result set.
 */
export async function resolveCommercialLocationScope(
  input: Pick<CommercialSearchInput, 'location' | 'locationIds'>,
): Promise<CommercialLocationScope> {
  const classified = classifyCommercialLocationScope(input);
  if (classified.status === 'none') return { status: 'none' };
  if (classified.status === 'invalid') return { status: 'empty' };

  if (classified.status === 'ids') {
    // Canonical ids are still resolved through the shared public location
    // authority. This rejects retired/missing nodes and invalid parent
    // hierarchies instead of relying on a bare FK match in the asset table.
    const resolutions = await Promise.all(
      classified.ids.map(id =>
        locationResolver.resolvePublicLocation({
          locationId: `${classified.level}:${id}`,
        }),
      ),
    );
    if (resolutions.some(result => result.status !== 'resolved' || !result.location)) {
      return { status: 'empty' };
    }
    return {
      status: 'scope',
      field: LOCATION_LEVEL_FIELD[classified.level],
      ids: classified.ids,
    };
  }

  const token = classified.token;
  // A bare token has no implicit level. Ask the canonical resolver for each
  // possible level and accept it only when exactly one authority resolves.
  // This deliberately rejects a province/city/suburb name collision instead
  // of choosing a precedence or widening the geography.
  const resolutions = await Promise.all([
    locationResolver.resolvePublicLocation({ provinceSlug: token }),
    locationResolver.resolvePublicLocation({ citySlug: token }),
    locationResolver.resolvePublicLocation({ suburbSlug: token }),
  ]);
  if (resolutions.some(result => result.status === 'ambiguous')) return { status: 'empty' };
  const resolved = resolutions.filter(
    (
      result,
    ): result is typeof result & {
      status: 'resolved';
      location: NonNullable<typeof result.location>;
    } => result.status === 'resolved' && Boolean(result.location),
  );
  if (resolved.length !== 1) return { status: 'empty' };
  const location = resolved[0].location;
  if (location.level === 'province') {
    return { status: 'scope', field: 'provinceId', ids: [location.province.id] };
  }
  if (location.level === 'city' && location.city) {
    return { status: 'scope', field: 'cityId', ids: [location.city.id] };
  }
  if (location.level === 'suburb' && location.suburb) {
    return { status: 'scope', field: 'suburbId', ids: [location.suburb.id] };
  }
  return { status: 'empty' };
}

async function publicCommercialRows(
  scope: CommercialLocationScope = { status: 'none' },
  useTypes: readonly CommercialSpaceClass[] = COMMERCIAL_SPACE_CLASSES,
  areaRange: { minAreaM2?: number; maxAreaM2?: number } = {},
) {
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
        eq(listings.propertyType, 'commercial'),
        inArray(commercialSpaces.spaceClass, useTypes as any),
        eq(commercialSpaces.lifecycleStatus, 'active'),
        eq(commercialAssets.lifecycleStatus, 'active'),
        eq(commercialAssets.locationConfirmationState, 'confirmed'),
        eq(commercialAvailabilities.transactionType, 'lease'),
        inArray(commercialAvailabilities.availabilityState, publicCandidateStates),
        // Commercial publication is an explicit Listing Engine transition.
        // A review-approved row is not public until it has the published
        // status written by the canonical approval workflow.
        eq(listings.status, 'published'),
        eq(listings.approvalStatus, 'approved'),
        ...(scope.status === 'scope' ? [inArray(commercialAssets[scope.field], scope.ids)] : []),
        ...(areaRange.minAreaM2 != null
          ? [gte(commercialSpaces.rentableAreaM2, String(areaRange.minAreaM2))]
          : []),
        ...(areaRange.maxAreaM2 != null
          ? [lte(commercialSpaces.rentableAreaM2, String(areaRange.maxAreaM2))]
          : []),
      ),
    )
    .orderBy(desc(listings.publishedAt), desc(listings.createdAt));
}

/**
 * Converts completed, governed Listing media to publicly deliverable URLs.
 * Storage keys never cross this boundary directly; a malformed key drops just
 * that item rather than invalidating an otherwise eligible Commercial space.
 */
export function projectPublicCommercialMedia(
  media: readonly any[],
  resolveMedia: (rawUrl: string | null | undefined) => string | null = resolveMediaDeliveryUrl,
) {
  return media
    .filter(isCompletedListingMedia)
    .map(item => {
      const rawUrl = getListingMediaUrl(item);
      const mediaType = getListingMediaType(item);
      if (!rawUrl || !mediaType) return null;

      try {
        const url = resolveMedia(rawUrl);
        if (!url) return null;
        const thumbnailUrl = item.thumbnailUrl ? resolveMedia(item.thumbnailUrl) : null;
        const previewUrl = item.previewUrl ? resolveMedia(item.previewUrl) : null;
        return {
          id: item.id,
          url,
          thumbnailUrl,
          previewUrl,
          mediaType,
          isPrimary: item.isPrimary ? 1 : 0,
          displayOrder: Number(item.displayOrder || 0),
          processingStatus: item.processingStatus || 'completed',
          originalFileName: item.originalFileName || null,
          mimeType: item.mimeType || null,
          duration: item.duration ?? null,
          width: item.width ?? null,
          height: item.height ?? null,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort(
      (left: any, right: any) =>
        left.displayOrder - right.displayOrder || Number(left.id) - Number(right.id),
    );
}

const COMMERCIAL_VAT_TREATMENTS = new Set(['included', 'excluded', 'not_applicable', 'unknown']);

function hasOwnRecordField(record: unknown, field: string): boolean {
  return Boolean(
    record && typeof record === 'object' && Object.prototype.hasOwnProperty.call(record, field),
  );
}

function publicFiniteNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error(`${label} must be numeric.`);
  }
  if (typeof value === 'string' && !value.trim()) throw new Error(`${label} must be numeric.`);
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) throw new Error(`${label} must be finite.`);
  return normalized;
}

function publicSafeInteger(value: unknown, label: string, positive = false): number | null {
  const normalized = publicFiniteNumber(value, label);
  if (normalized === null) return null;
  if (!Number.isSafeInteger(normalized) || (positive ? normalized <= 0 : normalized < 0)) {
    throw new Error(`${label} must be a ${positive ? 'positive' : 'non-negative'} whole number.`);
  }
  return normalized;
}

function publicDate(value: unknown, label: string): Date | null {
  if (value === null || value === undefined) return null;
  if (!(value instanceof Date) && typeof value !== 'string') {
    throw new Error(`${label} must be a valid date.`);
  }
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${label} must be a valid date.`);
  return parsed;
}

function assertPublicText(value: unknown, label: string, allowNull = false): void {
  if (value === null || value === undefined) {
    if (allowNull) return;
    throw new Error(`${label} is required.`);
  }
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
}

function assertPublicRecordShape(row: any): void {
  const listing = row?.listing;
  const asset = row?.asset;
  const space = row?.space;
  const availability = row?.availability;
  if (!listing || !asset || !space || !availability)
    throw new Error('Commercial record is incomplete.');

  publicSafeInteger(listing.id, 'Commercial Listing id', true);
  assertPublicText(listing.slug, 'Commercial Listing slug');
  assertPublicText(listing.title, 'Commercial Listing title');
  assertPublicText(listing.description, 'Commercial Listing description');
  assertPublicText(listing.city, 'Commercial Listing city');
  assertPublicText(listing.province, 'Commercial Listing province');
  assertPublicText(listing.suburb, 'Commercial Listing suburb', true);

  // Full database rows carry these lifecycle markers. Conditional checks keep
  // the pure projector usable with intentionally small contract fixtures.
  if (
    hasOwnRecordField(listing, 'propertyType') &&
    !isCommercialMarketingPropertyType(listing.propertyType)
  ) {
    throw new Error('Commercial Listing marker is invalid.');
  }
  if (hasOwnRecordField(listing, 'action') && listing.action !== 'rent') {
    throw new Error('Public Commercial discovery is lease-only.');
  }
  if (hasOwnRecordField(listing, 'status') && listing.status !== 'published') {
    throw new Error('Commercial Listing is not published.');
  }
  if (hasOwnRecordField(listing, 'approvalStatus') && listing.approvalStatus !== 'approved') {
    throw new Error('Commercial Listing is not approved.');
  }
  if (
    hasOwnRecordField(listing, 'locationConfirmationState') &&
    listing.locationConfirmationState !== 'confirmed'
  ) {
    throw new Error('Commercial Listing location is not confirmed.');
  }

  publicSafeInteger(asset.id, 'Commercial Asset id', true);
  assertPublicText(asset.name, 'Commercial Asset name');
  assertPublicText(asset.address, 'Commercial Asset address', true);
  if (hasOwnRecordField(asset, 'lifecycleStatus') && asset.lifecycleStatus !== 'active') {
    throw new Error('Commercial Asset is not active.');
  }
  if (
    hasOwnRecordField(asset, 'locationConfirmationState') &&
    asset.locationConfirmationState !== 'confirmed'
  ) {
    throw new Error('Commercial Asset location is not confirmed.');
  }

  publicSafeInteger(space.id, 'Commercial Space id', true);
  assertPublicText(space.identifier, 'Commercial Space identifier');
  if (hasOwnRecordField(space, 'lifecycleStatus') && space.lifecycleStatus !== 'active') {
    throw new Error('Commercial Space is not active.');
  }
  if (hasOwnRecordField(space, 'commercialAssetId')) {
    const linkedAssetId = publicSafeInteger(
      space.commercialAssetId,
      'Commercial Space asset id',
      true,
    );
    const assetId = publicSafeInteger(asset.id, 'Commercial Asset id', true);
    if (linkedAssetId !== assetId)
      throw new Error('Commercial Space is linked to a different Asset.');
  }

  publicSafeInteger(availability.id, 'Commercial Availability id', true);
  if (hasOwnRecordField(availability, 'commercialSpaceId')) {
    const linkedSpaceId = publicSafeInteger(
      availability.commercialSpaceId,
      'Commercial Availability space id',
      true,
    );
    const spaceId = publicSafeInteger(space.id, 'Commercial Space id', true);
    if (linkedSpaceId !== spaceId) {
      throw new Error('Commercial Availability is linked to a different Space.');
    }
  }
  if (
    hasOwnRecordField(availability, 'transactionType') &&
    availability.transactionType !== 'lease'
  ) {
    throw new Error('Public Commercial discovery is lease-only.');
  }
  if (
    hasOwnRecordField(availability, 'vatTreatment') &&
    !COMMERCIAL_VAT_TREATMENTS.has(availability.vatTreatment)
  ) {
    throw new Error('Commercial VAT treatment is not governed.');
  }

  // If both projections carry canonical geography, they must describe the
  // same physical asset. Never repair a mismatch by choosing display text.
  for (const field of ['provinceId', 'cityId', 'suburbId'] as const) {
    if (hasOwnRecordField(asset, field) && hasOwnRecordField(listing, field)) {
      const assetValue =
        asset[field] == null
          ? null
          : publicSafeInteger(asset[field], `Commercial Asset ${field}`, true);
      const listingValue =
        listing[field] == null
          ? null
          : publicSafeInteger(listing[field], `Commercial Listing ${field}`, true);
      if (assetValue !== listingValue)
        throw new Error('Commercial geography projections disagree.');
    }
  }
}

function publicCommercialSpecification(item: any) {
  if (!item || typeof item !== 'object') throw new Error('Commercial specification is malformed.');
  const rawBoolean = item.booleanValue;
  if (
    rawBoolean !== null &&
    rawBoolean !== undefined &&
    !(
      (typeof rawBoolean === 'number' && (rawBoolean === 0 || rawBoolean === 1)) ||
      (typeof rawBoolean === 'string' && (rawBoolean === '0' || rawBoolean === '1'))
    )
  ) {
    throw new Error('Commercial boolean specifications must be stored as 0 or 1.');
  }
  const specification = {
    specificationCode: item.specificationCode,
    valueState: item.valueState,
    numericValue: publicFiniteNumber(item.numericValue, 'Commercial numeric specification'),
    textValue: item.textValue,
    booleanValue: rawBoolean == null ? null : Number(rawBoolean) === 1,
  } as CommercialSpecificationInput;
  assertCommercialSpecificationInput(specification);
  return {
    ...item,
    ...specification,
    // The established client filtering contract uses the persisted 0/1 form.
    booleanValue: specification.booleanValue == null ? null : specification.booleanValue ? 1 : 0,
  };
}

function publicCommercialEconomics(item: any): CommercialEconomicsInput & {
  vatTreatment?: string | null;
} {
  if (!item || typeof item !== 'object') throw new Error('Commercial economics is malformed.');
  if (
    hasOwnRecordField(item, 'vatTreatment') &&
    !COMMERCIAL_VAT_TREATMENTS.has(item.vatTreatment)
  ) {
    throw new Error('Commercial economics VAT treatment is not governed.');
  }
  if (hasOwnRecordField(item, 'currency') && item.currency !== 'ZAR') {
    throw new Error('Commercial economics must be denominated in ZAR.');
  }
  return {
    ...item,
    componentCode: item.componentCode,
    valueState: item.valueState,
    chargeBasis: item.chargeBasis,
    amountMinor: publicSafeInteger(item.amountMinor, 'Commercial economics amount'),
    rangeMaximumMinor: publicSafeInteger(
      item.rangeMaximumMinor,
      'Commercial economics range maximum',
    ),
  } as CommercialEconomicsInput & { vatTreatment?: string | null };
}

function publicCommercialLeaseTerms(item: any, availabilityId: unknown) {
  if (!item || typeof item !== 'object') throw new Error('Commercial lease terms are malformed.');
  if (hasOwnRecordField(item, 'commercialAvailabilityId')) {
    const termAvailabilityId = publicSafeInteger(
      item.commercialAvailabilityId,
      'Commercial lease terms availability id',
      true,
    );
    const expectedAvailabilityId = publicSafeInteger(
      availabilityId,
      'Commercial Availability id',
      true,
    );
    if (termAvailabilityId !== expectedAvailabilityId) {
      throw new Error('Commercial lease terms are linked to a different Availability.');
    }
  }
  for (const field of ['minimumLeaseMonths', 'quotedLeaseMonths'] as const) {
    if (hasOwnRecordField(item, field) && item[field] != null) {
      publicSafeInteger(item[field], `Commercial lease ${field}`, true);
    }
  }
  for (const field of [
    'depositMinor',
    'tenantInstallationAllowanceMinor',
    'beneficialOccupationDays',
  ] as const) {
    if (hasOwnRecordField(item, field) && item[field] != null) {
      publicSafeInteger(item[field], `Commercial lease ${field}`);
    }
  }
  if (hasOwnRecordField(item, 'annualEscalationPercent') && item.annualEscalationPercent != null) {
    const escalation = publicFiniteNumber(
      item.annualEscalationPercent,
      'Commercial lease annual escalation',
    );
    if (escalation === null || escalation < 0) {
      throw new Error('Commercial lease annual escalation must be non-negative.');
    }
  }
  if (hasOwnRecordField(item, 'sourceLabel') && item.sourceLabel != null) {
    assertPublicText(item.sourceLabel, 'Commercial lease source label');
  }
  if (hasOwnRecordField(item, 'suppliedAt') && item.suppliedAt != null) {
    publicDate(item.suppliedAt, 'Commercial lease suppliedAt');
  }
  return item;
}

/**
 * Creates the public projection only after independently validating every
 * canonical fact read from storage. This is intentionally separate from the
 * database fetch so a malformed row is omitted, while an actual database
 * failure still reaches the caller as an operational error.
 */
export function projectPublicCommercialRecord(
  row: any,
  related: {
    specifications: readonly any[];
    economics: readonly any[];
    leaseTerms: readonly any[];
    media: readonly any[];
  },
) {
  try {
    assertPublicRecordShape(row);
    if (!isCommercialSpaceClass(row.space?.spaceClass)) {
      throw new Error('Commercial space class is not public.');
    }
    assertCommercialSpaceIdentity({
      spaceClass: row.space.spaceClass,
      spaceKind: row.space.spaceKind as CommercialSpaceKind,
      assetKind: row.asset?.assetKind as CommercialAssetKind,
    });
    assertCommercialSpaceAreas({
      rentableAreaM2: row.space.rentableAreaM2 == null ? null : Number(row.space.rentableAreaM2),
      usableAreaM2: row.space.usableAreaM2 == null ? null : Number(row.space.usableAreaM2),
    });
    if (row.space.rentableAreaM2 == null) {
      throw new Error('Public Commercial discovery requires a rentable area.');
    }
    assertCommercialAvailabilityFreshness({
      availabilityState: row.availability?.availabilityState,
      occupationDate: row.availability?.occupationDate,
      lastConfirmedAt: row.availability?.lastConfirmedAt,
      confirmationSource: row.availability?.confirmationSource,
      confirmationSourceLabel: row.availability?.confirmationSourceLabel,
      reconfirmationDueAt: row.availability?.reconfirmationDueAt,
    } as any);
    if (
      !isPublicCommercialAvailabilityDiscoverable({
        state: effectiveCommercialAvailabilityState(row.availability),
        reconfirmationDueAt: row.availability?.reconfirmationDueAt,
        confirmationSource: row.availability?.confirmationSource,
        confirmedAt: row.availability?.lastConfirmedAt,
        occupationDate: row.availability?.occupationDate,
      })
    ) {
      throw new Error('Commercial availability is not currently public.');
    }

    if (
      !Array.isArray(related.specifications) ||
      !Array.isArray(related.economics) ||
      !Array.isArray(related.leaseTerms) ||
      !Array.isArray(related.media)
    ) {
      throw new Error('Commercial related records are malformed.');
    }
    const specifications = related.specifications.map(publicCommercialSpecification);
    const specificationCodes = new Set<string>();
    for (const specification of specifications) {
      if (specificationCodes.has(specification.specificationCode)) {
        throw new Error('Commercial specifications contain a duplicate code.');
      }
      specificationCodes.add(specification.specificationCode);
    }
    const economics = related.economics.map(publicCommercialEconomics);
    assertCommercialPricingContract({
      pricingMode: row.availability?.pricingMode as CommercialPricingMode,
      economics,
    });

    if (related.leaseTerms.length > 1) {
      throw new Error('Commercial Availability has more than one lease-terms record.');
    }
    const leaseTerms = related.leaseTerms[0]
      ? publicCommercialLeaseTerms(related.leaseTerms[0], row.availability.id)
      : null;

    const publicMedia = projectPublicCommercialMedia(related.media);
    const passport = commercialCostPassport({
      rentableAreaM2: row.space.rentableAreaM2 == null ? null : Number(row.space.rentableAreaM2),
      specifications: specifications as any,
      pricingMode: row.availability.pricingMode as CommercialPricingMode,
      economics,
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
        kind: row.asset.assetKind,
        name: row.asset.name,
        address: row.asset.address,
        city: row.listing.city,
        suburb: row.listing.suburb,
        province: row.listing.province,
      },
      space: {
        id: row.space.id,
        useType: row.space.spaceClass,
        kind: row.space.spaceKind,
        identifier: row.space.identifier,
        rentableAreaM2: row.space.rentableAreaM2,
        usableAreaM2: row.space.usableAreaM2,
      },
      availability: {
        id: row.availability.id,
        ...availabilityPresentation(row.availability),
      },
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
      economics: economics.map((item, index) => ({
        ...item,
        vatTreatment: related.economics[index]?.vatTreatment,
      })),
      leaseTerms,
      specifications,
      media: publicMedia,
    };
  } catch {
    // Public search must fail closed record-by-record. The authoring/review
    // path remains the place that surfaces the precise remediation message.
    return null;
  }
}

async function publicCommercialDto(row: any) {
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
    db.select().from(listingMedia).where(eq(listingMedia.listingId, row.listing.id)),
  ]);
  return projectPublicCommercialRecord(row, { specifications, economics, leaseTerms, media });
}

export function isPublicCommercialAvailabilityDiscoverable(
  input: {
    state: string;
    reconfirmationDueAt?: string | Date | null;
    confirmationSource?: unknown;
    confirmedAt?: string | Date | null;
    occupationDate?: string | Date | null;
  },
  at = new Date(),
): boolean {
  if (input.state !== 'available_confirmed' && input.state !== 'available_upcoming') return false;

  const hasOwn = (key: string) => Object.prototype.hasOwnProperty.call(input, key);
  const hasDue = hasOwn('reconfirmationDueAt');
  const hasProvenance = hasOwn('confirmationSource') || hasOwn('confirmedAt');
  const hasOccupationDate = hasOwn('occupationDate');

  if (!Number.isFinite(at.getTime())) return false;

  // Existing pure callers that only have an already-effective state remain
  // supported. Whenever a raw deadline is present, public eligibility fails
  // closed for a missing, malformed, or elapsed deadline. Full DTOs also carry
  // the source and confirmation timestamp; those are required together so an
  // invalid legacy row cannot appear public merely because its deadline is in
  // the future.
  if (!hasDue && !hasProvenance && !hasOccupationDate) return true;
  const due =
    input.reconfirmationDueAt instanceof Date
      ? new Date(input.reconfirmationDueAt.getTime())
      : typeof input.reconfirmationDueAt === 'string' && input.reconfirmationDueAt.trim()
        ? new Date(input.reconfirmationDueAt)
        : null;
  if (!due || !Number.isFinite(due.getTime()) || due.getTime() < at.getTime()) return false;
  if (!hasProvenance) {
    if (input.state === 'available_upcoming' && (hasDue || hasOccupationDate)) {
      if (!hasOccupationDate) return false;
      const occupation =
        input.occupationDate instanceof Date
          ? new Date(input.occupationDate.getTime())
          : typeof input.occupationDate === 'string' && input.occupationDate.trim()
            ? new Date(input.occupationDate)
            : null;
      if (!occupation || !Number.isFinite(occupation.getTime())) return false;
      const todayUtc = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
      if (occupation.getTime() < todayUtc) return false;
    }
    return true;
  }

  if (!isCommercialConfirmationSource(input.confirmationSource)) return false;
  const confirmedAt =
    input.confirmedAt instanceof Date
      ? new Date(input.confirmedAt.getTime())
      : typeof input.confirmedAt === 'string' && input.confirmedAt.trim()
        ? new Date(input.confirmedAt)
        : null;
  if (!confirmedAt || !Number.isFinite(confirmedAt.getTime()) || due < confirmedAt) return false;
  // A future confirmation timestamp is not evidence available at the time of
  // this read. Reject it instead of allowing a clock-skewed row to publish.
  if (confirmedAt.getTime() > at.getTime()) return false;
  if (
    input.state === 'available_upcoming' &&
    (!input.occupationDate ||
      (() => {
        const occupation =
          input.occupationDate instanceof Date
            ? new Date(input.occupationDate.getTime())
            : typeof input.occupationDate === 'string' && input.occupationDate.trim()
              ? new Date(input.occupationDate)
              : null;
        if (!occupation || !Number.isFinite(occupation.getTime())) return true;
        const todayUtc = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
        return occupation.getTime() < todayUtc;
      })())
  )
    return false;
  return true;
}

export async function searchPublicCommercial(input: CommercialSearchInput = {}) {
  const useTypes = Array.from(new Set(input.useTypes || COMMERCIAL_SPACE_CLASSES));
  if (!useTypes.length || useTypes.some(useType => !isCommercialSpaceClass(useType))) return [];
  const scope = await resolveCommercialLocationScope(input);
  if (scope.status === 'empty') return [];
  const rows = await publicCommercialRows(scope, useTypes, {
    minAreaM2: input.minAreaM2,
    maxAreaM2: input.maxAreaM2,
  });
  const dtos = (await Promise.all(rows.map(publicCommercialDto))).filter(Boolean) as any[];
  return dtos.filter(item => {
    if (!isPublicCommercialAvailabilityDiscoverable(item.availability)) return false;
    const specs = new Map<string, any>(
      item.specifications.map((s: any) => [s.specificationCode, s]),
    );
    if (input.availability === 'now' && item.availability.state !== 'available_confirmed')
      return false;
    if (input.availability === 'future' && item.availability.state !== 'available_upcoming')
      return false;
    if (input.pricingMode && item.pricing.mode !== input.pricingMode) return false;
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
    if (
      input.minEavesHeightM != null &&
      Number(specs.get('eaves_height_m')?.numericValue || 0) < input.minEavesHeightM
    )
      return false;
    if (
      input.minPowerCapacityKva != null &&
      Number(specs.get('power_capacity_kva')?.numericValue || 0) < input.minPowerCapacityKva
    )
      return false;
    if (
      input.minLoadingDocks != null &&
      Number(specs.get('loading_docks')?.numericValue || 0) < input.minLoadingDocks
    )
      return false;
    if (input.yardHardstand && specs.get('yard_hardstand')?.booleanValue !== 1) return false;
    if (input.extractionCapability && specs.get('extraction_capability')?.booleanValue !== 1)
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

export async function publicCommercialDetail(slug: string) {
  return (await searchPublicCommercial()).find(item => item.slug === slug) || null;
}

export async function resolvePublicCommercialLeadCustody(input: {
  listingId: number;
  commercialAvailabilityId: number;
}) {
  const detail = (await searchPublicCommercial()).find(
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
  if (listing?.agentId && listing?.agencyId) {
    const [agent] = await db
      .select({ agencyId: agents.agencyId })
      .from(agents)
      .where(eq(agents.id, listing.agentId))
      .limit(1);
    if (
      !agent ||
      !isCommercialRecipientAssociationCoherent({
        listingAgencyId: listing.agencyId,
        agentAgencyId: agent.agencyId,
      })
    ) {
      return null;
    }
  }
  return {
    listingId: input.listingId,
    commercialAssetId: detail.asset.id,
    commercialSpaceId: detail.space.id,
    commercialAvailabilityId: detail.availability.id,
    agentId: listing?.agentId ?? null,
    agencyId: listing?.agencyId ?? null,
  };
}
