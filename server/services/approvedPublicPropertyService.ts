import * as listingDb from '../db';
import { resolveMediaDeliveryUrl } from '../_core/mediaStorage';
import {
  buildCanonicalCorePropertyDetails,
  buildCorePropertyInformation,
} from '../../shared/core-property-information';
import { normalizeFeaturesContext } from '../../shared/features-context';
import {
  getListingMediaType,
  getListingMediaUrl,
  getPrimaryListingImage,
  isCompletedListingMedia,
} from '../../shared/listing-media';
import {
  getPresentationMediaDescriptor,
  getSafePropertyPresentationVirtualTour,
  safeParsePropertyPresentation,
  summarizePropertyPresentation,
} from '../../shared/property-presentation';
import { buildPricingContract, getPrimaryPrice } from '../../shared/pricing-contract';
import { toPublicPropertyType } from '../../shared/property-taxonomy';
import { normalizeCoordinatePair } from '../../shared/location-contract';

export interface ApprovedPublicPropertyDataSource {
  getPropertyById(propertyId: number): Promise<any>;
  getPropertyImages(propertyId: number): Promise<any[]>;
  getListingById(listingId: number): Promise<any>;
  getListingMedia(listingId: number): Promise<any[]>;
}

export interface ApprovedPublicPropertyResolution {
  property: Record<string, any>;
  images: Array<Record<string, any>>;
  media: Array<Record<string, any>>;
  authority: 'approved_listing';
  /** Internal bridge metadata; never a public route identity. */
  sourceListingId: number | null;
}

const defaultDataSource: ApprovedPublicPropertyDataSource = {
  getPropertyById: propertyId => listingDb.getPropertyById(propertyId),
  getPropertyImages: propertyId => listingDb.getPropertyImages(propertyId),
  getListingById: listingId => listingDb.getListingById(listingId),
  getListingMedia: listingId => listingDb.getListingMedia(listingId),
};

function isPublicPropertyStatus(status: unknown): boolean {
  return status === 'available' || status === 'published';
}

function isApprovedSourceListing(listing: any, expectedListingId: number): boolean {
  return Boolean(
    listing &&
    Number(listing.id) === expectedListingId &&
    listing.revisionOfListingId == null &&
    (listing.status === 'published' || listing.status === 'approved') &&
    listing.approvalStatus === 'approved',
  );
}

function parseRecord(value: unknown): Record<string, any> | null {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : null;
  } catch {
    return null;
  }
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .flatMap(value => (Array.isArray(value) ? value : [value]))
        .map(value => String(value ?? '').trim())
        .filter(Boolean),
    ),
  );
}

function publicProjectionFields(property: Record<string, any>): Record<string, any> {
  const projection = { ...property };
  for (const privateField of [
    'sourceListingId',
    'placeId',
    'privateAddress',
    'coordinateSource',
    'locationConfirmationState',
    'providerLocationPlaceId',
    'provider',
  ]) {
    delete projection[privateField];
  }
  return projection;
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalizeJson(entry)]),
  );
}

function jsonValuesMatch(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalizeJson(left)) === JSON.stringify(canonicalizeJson(right));
}

function buildApprovedSourceDetails(
  sourceListing: Record<string, any>,
): { sourceDetails: Record<string, any>; publicDetails: Record<string, any> } | null {
  const sourceDetails = parseRecord(sourceListing.propertyDetails);
  if (!sourceDetails) return null;

  const canonicalDetails: Record<string, any> = {
    ...sourceDetails,
    featuresContext: normalizeFeaturesContext(sourceDetails.featuresContext, sourceDetails),
    ...buildCanonicalCorePropertyDetails(sourceListing.propertyType, sourceDetails),
  };
  const pricingContract = buildPricingContract(
    sourceListing.action,
    sourceListing.pricing,
    canonicalDetails,
  );
  if (pricingContract) canonicalDetails.pricingContract = pricingContract;

  return { sourceDetails, publicDetails: canonicalDetails };
}

function normalizeProjectionImages(rawImages: any[]) {
  return rawImages
    .map(image => {
      const imageUrl = resolveMediaDeliveryUrl(image.imageUrl);
      if (!imageUrl) return null;
      return {
        ...image,
        imageUrl,
        url: imageUrl,
        isPrimary: Number(image.isPrimary || 0) === 1 ? 1 : 0,
        displayOrder: Number(image.displayOrder || 0),
      };
    })
    .filter(Boolean)
    .sort(
      (left: any, right: any) =>
        Number(left.displayOrder) - Number(right.displayOrder) ||
        Number(left.id) - Number(right.id),
    ) as Array<Record<string, any>>;
}

function normalizeApprovedListingMedia(mediaRows: any[], propertyDetails: Record<string, any>) {
  const mediaCandidates = mediaRows
    .filter(item => isCompletedListingMedia(item))
    .flatMap(item => {
      const rawUrl = getListingMediaUrl(item);
      const mediaType = getListingMediaType(item);
      if (!rawUrl || !mediaType) return [];
      const url = resolveMediaDeliveryUrl(rawUrl);
      if (!url) return [];
      const descriptor = getPresentationMediaDescriptor(propertyDetails.propertyPresentation, {
        id: item.id,
        type: mediaType,
        mediaType,
        url: rawUrl,
        originalUrl: item.originalUrl,
        originalFileName: item.originalFileName,
      });

      return [
        {
          id: item.id,
          imageUrl: url,
          url,
          mediaType,
          type: mediaType,
          isPrimary: Number(item.isPrimary || 0) === 1 ? 1 : 0,
          displayOrder: Number(item.displayOrder || 0),
          thumbnailUrl: item.thumbnailUrl || null,
          previewUrl: item.previewUrl || null,
          processingStatus: item.processingStatus || 'completed',
          originalFileName: item.originalFileName || null,
          mimeType: item.mimeType || null,
          presentationKind: descriptor.kind,
          presentationLabel: descriptor.label || null,
          originalUrl: item.originalUrl,
        },
      ];
    })
    .sort(
      (left, right) =>
        Number(left.displayOrder) - Number(right.displayOrder) ||
        Number(left.id) - Number(right.id),
    );

  const primaryImage = getPrimaryListingImage(mediaCandidates);
  return mediaCandidates.map(item => ({
    ...item,
    isPrimary: primaryImage && Number(primaryImage.id) === Number(item.id) ? 1 : 0,
  }));
}

function mediaIdentityCandidates(media: Record<string, any>): Set<string> {
  const identities = [media.id, media.url, media.originalUrl]
    .filter(value => value !== undefined && value !== null && String(value).trim())
    .map(value => String(value).trim());
  if (media.id !== undefined && media.id !== null) identities.push(`existing:${String(media.id)}`);
  return new Set(identities);
}

function presentationIsCoherent(
  sourceDetails: Record<string, any>,
  projectionSettings: Record<string, any>,
  approvedMedia: Array<Record<string, any>>,
): boolean {
  const sourcePresentation = safeParsePropertyPresentation(sourceDetails.propertyPresentation);
  const projectedPresentation = safeParsePropertyPresentation(
    projectionSettings.propertyPresentation,
  );
  if (!sourcePresentation.success || !projectedPresentation.success) return false;

  if (!jsonValuesMatch(sourcePresentation.data ?? null, projectedPresentation.data ?? null)) {
    return false;
  }

  const presentation = sourcePresentation.data;
  if (!presentation) {
    return !approvedMedia.some(item => item.mediaType === 'floorplan' || item.mediaType === 'pdf');
  }

  const mediaIdentities = approvedMedia.map(mediaIdentityCandidates);
  const referencedMediaIndexes = new Set<number>();
  for (const entry of presentation.media) {
    const index = mediaIdentities.findIndex(identities => identities.has(entry.mediaId));
    if (index < 0 || referencedMediaIndexes.has(index)) return false;
    referencedMediaIndexes.add(index);

    const mediaType = approvedMedia[index]?.mediaType;
    if (entry.kind === 'floorplan' && mediaType !== 'floorplan' && mediaType !== 'pdf')
      return false;
    if (entry.kind === 'document' && mediaType !== 'pdf') return false;
  }

  return approvedMedia.every((item, index) => {
    if (item.mediaType !== 'floorplan' && item.mediaType !== 'pdf') return true;
    return referencedMediaIndexes.has(index);
  });
}

function dateValue(value: unknown): number | null {
  if (!value) return null;
  const timestamp = new Date(value as string | number | Date).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function mediaBelongsToApprovedVersion(
  sourceListing: Record<string, any>,
  mediaRows: Array<Record<string, any>>,
): boolean {
  const approvedVersionTimestamp = dateValue(sourceListing.updatedAt);
  if (approvedVersionTimestamp === null) return false;

  return mediaRows.every(media => {
    const mediaTimestamps = [media.createdAt, media.uploadedAt, media.processedAt]
      .map(dateValue)
      .filter((value): value is number => value !== null);
    return mediaTimestamps.every(timestamp => timestamp <= approvedVersionTimestamp + 1_000);
  });
}

function imageMirrorIsCoherent(
  property: Record<string, any>,
  projectionImages: Array<Record<string, any>>,
  approvedMedia: Array<Record<string, any>>,
): boolean {
  const sourceImages = approvedMedia.filter(item => item.mediaType === 'image');
  if (sourceImages.length !== projectionImages.length) return false;

  for (let index = 0; index < sourceImages.length; index += 1) {
    const source = sourceImages[index];
    const projection = projectionImages[index];
    if (
      source.url !== projection.imageUrl ||
      Number(source.displayOrder) !== Number(projection.displayOrder) ||
      Number(source.isPrimary) !== Number(projection.isPrimary)
    ) {
      return false;
    }
  }

  const primary = sourceImages.find(item => Number(item.isPrimary) === 1) || sourceImages[0];
  const projectedMainImage = resolveMediaDeliveryUrl(property.mainImage);
  return (primary?.url || null) === projectedMainImage;
}

function actionToPublicListingType(action: unknown) {
  if (action === 'sell') return 'sale';
  if (action === 'rent') return 'rent';
  if (action === 'auction') return 'auction';
  return null;
}

function knownNumericFact(value: any): number | undefined {
  return value?.status === 'known' && Number.isFinite(Number(value.value))
    ? Number(value.value)
    : undefined;
}

function knownMeasurement(value: any): number | undefined {
  return value?.status === 'known' && Number.isFinite(Number(value.valueM2))
    ? Number(value.valueM2)
    : undefined;
}

function mapApprovedListingProperty(
  property: Record<string, any>,
  sourceListing: Record<string, any>,
  projectionImages: Array<Record<string, any>>,
  mediaRows: any[],
): ApprovedPublicPropertyResolution | null {
  const approvedSourceDetails = buildApprovedSourceDetails(sourceListing);
  const projectionSettings = parseRecord(property.propertySettings);
  if (!approvedSourceDetails || !projectionSettings) return null;
  const { sourceDetails, publicDetails: propertyDetails } = approvedSourceDetails;

  const publicListingType = actionToPublicListingType(sourceListing.action);
  if (!publicListingType) return null;

  let publicPropertyType: string;
  try {
    publicPropertyType = toPublicPropertyType(String(sourceListing.propertyType));
  } catch {
    return null;
  }

  const price = getPrimaryPrice(sourceListing.action, sourceListing.pricing, propertyDetails);
  if (price === undefined || !Number.isFinite(Number(price)) || Number(price) <= 0) return null;

  // These fields are mirrored on every successful approval. A mismatch means
  // the source and public projection no longer describe one committed version.
  if (
    String(property.title) !== String(sourceListing.title) ||
    String(property.description) !== String(sourceListing.description) ||
    Number(property.price) !== Number(price) ||
    String(property.propertyType) !== publicPropertyType ||
    String(property.listingType) !== publicListingType
  ) {
    return null;
  }

  // propertySettings is the approval-written compatibility snapshot. It is
  // not a Detail field authority, but it lets the read boundary prove that
  // the approved source facts and projection came from one committed version.
  const projectionMatchesApprovedSource =
    jsonValuesMatch(propertyDetails, projectionSettings) ||
    jsonValuesMatch(sourceDetails, projectionSettings);
  if (!projectionMatchesApprovedSource) return null;

  if (!mediaBelongsToApprovedVersion(sourceListing, mediaRows)) return null;

  const approvedMedia = normalizeApprovedListingMedia(mediaRows, propertyDetails);
  if (!imageMirrorIsCoherent(property, projectionImages, approvedMedia)) return null;
  if (!presentationIsCoherent(propertyDetails, projectionSettings, approvedMedia)) return null;

  const core = buildCorePropertyInformation(sourceListing.propertyType, propertyDetails);
  const bedrooms = knownNumericFact(core.bedrooms);
  const bathrooms = knownNumericFact(core.bathrooms);
  const internalAreaM2 = knownMeasurement(core.internalArea);
  const erfSizeM2 = knownMeasurement(core.erfArea);
  const landAreaM2 =
    core.farmLandArea?.status === 'known' ? Number(core.farmLandArea.normalizedM2) : undefined;
  const area = internalAreaM2 ?? erfSizeM2 ?? landAreaM2;
  const featuresContext = normalizeFeaturesContext(
    propertyDetails.featuresContext,
    propertyDetails,
  );
  const amenities = uniqueStrings([
    featuresContext.spaces,
    featuresContext.security.features,
    propertyDetails.amenities,
  ]);
  const propertyDetailsContract = {
    ...propertyDetails,
    featuresContext,
    ...(bedrooms !== undefined ? { bedrooms } : {}),
    ...(bathrooms !== undefined ? { bathrooms } : {}),
    ...(area !== undefined ? { area } : {}),
  };
  const pricingContract = buildPricingContract(
    sourceListing.action,
    sourceListing.pricing,
    propertyDetails,
  );
  const images = approvedMedia.filter(item => item.mediaType === 'image');
  const approvedVideo = approvedMedia.find(item => item.mediaType === 'video');
  const primaryImage = images.find(item => Number(item.isPrimary) === 1) || images[0];
  const virtualTour = getSafePropertyPresentationVirtualTour(propertyDetails.propertyPresentation);
  const sourceListingId = Number(property.sourceListingId);
  const publicProjection = publicProjectionFields(property);
  const publicCoordinates = normalizeCoordinatePair(
    property.publicLatitude,
    property.publicLongitude,
  );
  const publicLocationPrecision =
    property.publicLocationPrecision === 'exact' ? 'exact' : 'approximate';

  return {
    authority: 'approved_listing',
    sourceListingId,
    property: {
      ...publicProjection,
      sourceType: 'approved_listing_projection',
      title: sourceListing.title,
      description: sourceListing.description,
      price: Number(price),
      displayPrice: Number(price),
      ...(pricingContract ? { pricingContract } : {}),
      listingType: publicListingType,
      transactionType: publicListingType,
      propertyType: publicPropertyType,
      bedrooms,
      bathrooms,
      area,
      internalAreaM2,
      erfSizeM2,
      landAreaM2,
      // Public location and attribution are projection-owned. Never recover
      // them from the source listing's private authoring fields.
      suburb: undefined,
      city: property.city,
      province: property.province,
      address: property.publicAddress || undefined,
      zipCode: publicLocationPrecision === 'exact' ? property.zipCode || undefined : undefined,
      latitude: publicCoordinates?.latitude ?? null,
      longitude: publicCoordinates?.longitude ?? null,
      publicAddress: property.publicAddress ?? null,
      publicLatitude: publicCoordinates?.latitude ?? null,
      publicLongitude: publicCoordinates?.longitude ?? null,
      publicLocationPrecision,
      // Provider/location authoring evidence is never part of the public
      // listing-backed contract.
      placeId: null,
      virtualTour: virtualTour || null,
      virtualTourUrl: virtualTour?.embedUrl || null,
      // Typed presentation is source-owned. Never retain a projection video
      // compatibility value that was not part of the approved media manifest.
      videoUrl: approvedVideo?.url || null,
      mediaSummary: summarizePropertyPresentation(mediaRows, propertyDetails.propertyPresentation),
      amenities,
      features: propertyDetails.propertyHighlights || amenities,
      propertySettings: propertyDetailsContract,
      propertyDetails: propertyDetailsContract,
      mainImage: primaryImage?.url || '',
      media: approvedMedia,
      listingSource: 'manual',
    },
    images,
    media: approvedMedia,
  };
}

/**
 * Resolve the one public contract for a manual property identity.
 *
 * Listing-backed properties fail closed unless their stable projection and
 * last-approved source aggregate are one coherent committed version. The
 * projection-only historical mapper is intentionally not a public authority;
 * unlinked rows must be migrated or quarantined before they can re-enter the
 * public buyer journey.
 */
export async function resolveApprovedPublicProperty(
  propertyId: number,
  dataSource: ApprovedPublicPropertyDataSource = defaultDataSource,
): Promise<ApprovedPublicPropertyResolution | null> {
  if (!Number.isSafeInteger(propertyId) || propertyId <= 0) return null;

  const property = await dataSource.getPropertyById(propertyId);
  if (!property || Number(property.id) !== propertyId || !isPublicPropertyStatus(property.status)) {
    return null;
  }

  const projectionImages = normalizeProjectionImages(
    await dataSource.getPropertyImages(propertyId),
  );
  if (property.sourceListingId == null) return null;

  const sourceListingId = Number(property.sourceListingId);
  if (!Number.isSafeInteger(sourceListingId) || sourceListingId <= 0) return null;

  const sourceListing = await dataSource.getListingById(sourceListingId);
  if (!isApprovedSourceListing(sourceListing, sourceListingId)) return null;

  const approvedMedia = await dataSource.getListingMedia(sourceListingId);
  return mapApprovedListingProperty(property, sourceListing, projectionImages, approvedMedia);
}

/**
 * Resolve the canonical public eligibility set for a collection of property
 * projection IDs. This deliberately uses the same full source/projection/media
 * contract as detail rather than introducing a weaker search-only predicate.
 */
export async function resolveApprovedPublicPropertyIds(
  propertyIds: readonly number[],
  dataSource: ApprovedPublicPropertyDataSource = defaultDataSource,
): Promise<number[]> {
  const uniqueIds = Array.from(
    new Set(
      propertyIds.filter(id => Number.isSafeInteger(id) && id > 0),
    ),
  );
  const eligibleIds: number[] = [];
  const concurrency = 8;

  for (let offset = 0; offset < uniqueIds.length; offset += concurrency) {
    const batch = uniqueIds.slice(offset, offset + concurrency);
    const resolutions = await Promise.all(
      batch.map(propertyId => resolveApprovedPublicProperty(propertyId, dataSource)),
    );
    resolutions.forEach((resolution, index) => {
      if (resolution?.authority === 'approved_listing') eligibleIds.push(batch[index]);
    });
  }

  return eligibleIds;
}
