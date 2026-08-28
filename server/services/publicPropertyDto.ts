import type { PublicPropertySupplyIdentity } from '../../shared/types';
import { buildCanonicalCorePropertyDetails } from '../../shared/core-property-information';
import { normalizeFeaturesContext } from '../../shared/features-context';
import { buildPricingContract, type ActivePricingContract } from '../../shared/pricing-contract';
import { isListingPropertyType, type ListingPropertyType } from '../../shared/property-taxonomy';
import {
  buildPublicPropertyDetailPresentation,
  type PublicPropertyDetailPresentation,
} from '../../shared/public-property-detail-presentation';
import type { CorePropertyInformation } from '../../shared/core-property-information';
import type { FeaturesContext } from '../../shared/features-context';
import type { PublicPropertyEligibilityResolution } from './publicPropertyEligibilityService';

type PublicRecord = Record<string, unknown>;

const PUBLIC_PROPERTY_FIELDS = [
  'id',
  'title',
  'description',
  'propertyType',
  'listingType',
  'transactionType',
  'price',
  'displayPrice',
  'bedrooms',
  'bathrooms',
  'area',
  'address',
  'city',
  'province',
  'suburb',
  'zipCode',
  'latitude',
  'longitude',
  'publicAddress',
  'publicLatitude',
  'publicLongitude',
  'publicLocationPrecision',
  'amenities',
  'features',
  'yearBuilt',
  'featured',
  'levies',
  'ratesAndTaxes',
  'mainImage',
  'videoUrl',
  'virtualTourUrl',
  'virtualTour',
  'internalAreaM2',
  'erfSizeM2',
  'landAreaM2',
  'pricingContract',
  'propertyDetails',
  'mediaSummary',
  'listingSource',
  'development',
  'developerBrand',
] as const;

/**
 * Authoring and custody keys can occur inside extensible listing JSON as well
 * as at the property-row level. Public property facts are cloned through this
 * boundary so a future authoring field cannot silently become a public API.
 */
const PRIVATE_NESTED_KEYS = new Set([
  'ownerid',
  'agentid',
  'agencyid',
  'sourcelistingid',
  'cataloguepublisherid',
  'custody',
  'leadcustody',
  'recipientid',
  'recipienttype',
  'privateaddress',
  'placeid',
  'providerlocationplaceid',
  'coordinatesource',
  'locationconfirmationstate',
  'provider',
  'createdby',
  'updatedby',
  'reviewedby',
  'moderatedby',
]);

function sanitizePublicValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizePublicValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as PublicRecord)
      .filter(([key]) => !PRIVATE_NESTED_KEYS.has(key.toLowerCase()))
      .map(([key, entry]) => [key, sanitizePublicValue(entry)]),
  );
}

function parsePublicRecord(value: unknown): PublicRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as PublicRecord;
  }
  if (typeof value !== 'string' || !value.trim()) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as PublicRecord)
      : {};
  } catch {
    return {};
  }
}

function publicListingAction(source: PublicRecord): 'sell' | 'rent' | undefined {
  const listingType = String(source.listingType || source.transactionType || '')
    .trim()
    .toLowerCase();
  if (listingType === 'sale' || listingType === 'sell') return 'sell';
  if (listingType === 'rent') return 'rent';
  return undefined;
}

function publicPricingContract(
  source: PublicRecord,
  details: PublicRecord,
): ActivePricingContract | undefined {
  const action = publicListingAction(source);
  if (!action) return undefined;

  // The builder is the typed pricing authority. It reads a valid embedded
  // contract when present and otherwise derives only known pricing fields.
  // Unknown keys in either JSON object can therefore never cross the public
  // DTO boundary.
  return buildPricingContract(
    action,
    {
      ...source,
      ...(action === 'sell' ? { askingPrice: source.price } : { monthlyRent: source.price }),
    },
    details,
  );
}

function publicPropertyDetails(source: PublicRecord): PublicRecord {
  const details = parsePublicRecord(source.propertyDetails);
  const propertyType: ListingPropertyType | undefined = isListingPropertyType(source.propertyType)
    ? source.propertyType
    : undefined;
  const pricingContract = publicPricingContract(source, details);

  // `propertyDetails` is extensible authoring JSON. Public detail deliberately
  // exposes only the canonical typed buyer facts and derived compatibility
  // aliases, never arbitrary future authoring/workflow keys.
  return {
    ...buildCanonicalCorePropertyDetails(propertyType, details, source),
    featuresContext: normalizeFeaturesContext(details.featuresContext, details),
    ...(pricingContract ? { pricingContract } : {}),
  };
}

function publicDevelopment(value: unknown): PublicRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const development = value as PublicRecord;
  return {
    ...(development.id !== undefined ? { id: development.id } : {}),
    ...(development.name ? { name: development.name } : {}),
    ...(development.slug ? { slug: development.slug } : {}),
  };
}

function publicDeveloperBrand(value: unknown): PublicRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const brand = value as PublicRecord;
  return {
    ...(brand.id !== undefined ? { id: brand.id } : {}),
    ...(brand.brandName ? { brandName: brand.brandName } : {}),
    ...(brand.slug ? { slug: brand.slug } : {}),
    ...(brand.logoUrl ? { logoUrl: brand.logoUrl } : {}),
    ...(brand.publicContactEmail ? { publicContactEmail: brand.publicContactEmail } : {}),
    ...(brand.publicContactPhone ? { publicContactPhone: brand.publicContactPhone } : {}),
  };
}

function publicVirtualTour(value: unknown): PublicRecord | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const tour = value as PublicRecord;
  if (tour.provider !== 'matterport' || tour.status !== 'active' || !tour.embedUrl) {
    return undefined;
  }
  return {
    provider: 'matterport',
    status: 'active',
    embedUrl: tour.embedUrl,
    ...(tour.displayLabel ? { displayLabel: tour.displayLabel } : {}),
  };
}

function sanitizePublicPropertyField(field: string, value: unknown, source: PublicRecord): unknown {
  if (field === 'development') return publicDevelopment(value);
  if (field === 'developerBrand') return publicDeveloperBrand(value);
  if (field === 'virtualTour') return publicVirtualTour(value);
  if (field === 'propertyDetails') return publicPropertyDetails(source);
  if (field === 'pricingContract') {
    return publicPricingContract(source, parsePublicRecord(source.propertyDetails));
  }
  return sanitizePublicValue(value);
}

function toPublicIdentity(identity: PublicPropertySupplyIdentity): PublicPropertySupplyIdentity {
  return {
    role: identity.role,
    provenance: identity.provenance,
    name: identity.name,
    organizationName: identity.organizationName ?? null,
    organizationLogoUrl: identity.organizationLogoUrl ?? null,
    avatarUrl: identity.avatarUrl ?? null,
    phone: identity.phone ?? null,
    whatsapp: identity.whatsapp ?? null,
    email: identity.email ?? null,
    ...(identity.agentId ? { agentId: identity.agentId } : {}),
    ...(identity.agencyId ? { agencyId: identity.agencyId } : {}),
    ...(identity.cataloguePublisherId
      ? { cataloguePublisherId: identity.cataloguePublisherId }
      : {}),
  };
}

export interface PublicPropertyImageDto {
  id?: unknown;
  imageUrl: string;
  url: string;
  isPrimary: number;
  displayOrder: number;
  mediaType: 'image';
}

export interface PublicPropertyMediaDto {
  id?: unknown;
  url: string;
  mediaType: 'image' | 'video' | 'floorplan' | 'pdf';
  mimeType?: string;
  presentationKind?: 'floorplan' | 'document';
  presentationLabel?: string;
  isPrimary: number;
  displayOrder: number;
}

export function toPublicPropertyImage(image: PublicRecord): PublicPropertyImageDto {
  const url = String(image.imageUrl || image.url || '').trim();
  return {
    ...(image.id !== undefined ? { id: image.id } : {}),
    imageUrl: url,
    url,
    isPrimary: Number(image.isPrimary || 0) === 1 ? 1 : 0,
    displayOrder: Number(image.displayOrder || 0),
    mediaType: 'image',
  };
}

export function toPublicPropertyMedia(media: PublicRecord): PublicPropertyMediaDto | null {
  const mediaType = String(media.mediaType || '').trim();
  if (!['image', 'video', 'floorplan', 'pdf'].includes(mediaType)) return null;
  const presentationKind = String(media.presentationKind || '').trim();
  return {
    ...(media.id !== undefined ? { id: media.id } : {}),
    url: String(media.url || media.imageUrl || '').trim(),
    mediaType: mediaType as PublicPropertyMediaDto['mediaType'],
    ...(media.mimeType ? { mimeType: String(media.mimeType) } : {}),
    ...(presentationKind === 'floorplan' || presentationKind === 'document'
      ? { presentationKind }
      : {}),
    ...(media.presentationLabel ? { presentationLabel: String(media.presentationLabel) } : {}),
    isPrimary: Number(media.isPrimary || 0) === 1 ? 1 : 0,
    displayOrder: Number(media.displayOrder || 0),
  };
}

export interface PublicPropertyDetailDto {
  property: PublicRecord & {
    id: number;
    title: string;
    publicIdentity: PublicPropertySupplyIdentity;
    images: PublicPropertyImageDto[];
    media: PublicPropertyMediaDto[];
    detailPresentation: PublicPropertyDetailPresentation;
  };
  images: PublicPropertyImageDto[];
  media: PublicPropertyMediaDto[];
}

/**
 * The sole serialization boundary for an eligible manual public property.
 * Eligibility resolutions deliberately retain source and custody evidence for
 * server decisions; this DTO deliberately does not.
 */
export function toPublicPropertyDetailDto(
  resolution: PublicPropertyEligibilityResolution,
): PublicPropertyDetailDto {
  const source = resolution.property;
  const property: PublicRecord = {};
  const publicDetails = publicPropertyDetails(source);

  for (const field of PUBLIC_PROPERTY_FIELDS) {
    // Pricing is a derived public contract and can live only inside approved
    // source details, so serialize it even when the projection has no scalar
    // `pricingContract` column/value.
    if (source[field] === undefined && field !== 'pricingContract') continue;
    const publicValue =
      field === 'propertyDetails'
        ? publicDetails
        : sanitizePublicPropertyField(field, source[field], source);
    if (publicValue !== undefined) property[field] = publicValue;
  }

  const images = resolution.images
    .map(image => toPublicPropertyImage(image))
    .filter(image => Boolean(image.url));
  const media = resolution.media
    .map(item => toPublicPropertyMedia(item))
    .filter((item): item is PublicPropertyMediaDto => Boolean(item?.url));
  const publicIdentity = toPublicIdentity(resolution.publicIdentity);
  const detailPresentation = buildPublicPropertyDetailPresentation({
    listingType: source.listingType ?? source.transactionType,
    propertyType: source.propertyType,
    price: source.price,
    corePropertyInformation: publicDetails.corePropertyInformation as CorePropertyInformation,
    featuresContext: publicDetails.featuresContext as FeaturesContext,
    pricingContract: publicDetails.pricingContract as ActivePricingContract | undefined,
    // The eligibility resolution has already projected these values for public
    // use. Keep the detail presentation on that public projection rather than
    // allowing the browser to assemble a location from loose property fields.
    publicLocation: {
      address: source.publicAddress,
      city: source.city,
      province: source.province,
      precision: source.publicLocationPrecision,
      latitude: source.publicLatitude,
      longitude: source.publicLongitude,
    },
    media,
    photoCount: images.length,
    hasVirtualTour: Boolean(publicVirtualTour(source.virtualTour)),
  });

  return {
    property: {
      ...property,
      id: Number(source.id),
      title: String(source.title || '').trim(),
      publicIdentity,
      images,
      media,
      detailPresentation,
    },
    images,
    media,
  };
}
