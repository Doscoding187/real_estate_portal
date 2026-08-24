/**
 * Listing Router - tRPC endpoints for listing management
 *
 * Handles: Create, Update, Delete, Approve, Analytics, Media Upload
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { and, count, desc, eq } from 'drizzle-orm';
import { agents, leads, locations, properties } from '../drizzle/schema';
import * as db from './db';
import { ENV } from './_core/env';
import {
  buildListingLocationPersistence,
  buildUnresolvedDraftLocation,
  ListingLocationResolutionError,
  prepareListingLocationUpdate,
  resolveCanonicalListingLocation,
  validateListingRecordLocation,
} from './services/listingLocationResolver';
import { calculateListingReadiness } from './lib/readiness';
import { calculateListingQualityScore } from './lib/quality';
import { requireUser } from './_core/requireUser';
import { recordAgentOsEvent } from './services/agentOsEventService';
import { resolvePropertyForListing } from './services/inventoryLinkResolver';
import { prepareSellerProspectListingConversion } from './services/sellerProspectAccessService';
import {
  assertListingPublicationEntitled,
  evaluateAgencyPublicationReadiness,
  ListingPublicationEntitlementError,
} from './services/listingPublicationEntitlementService';
import {
  getListingAuthoringValidationMessage,
  LISTING_PROPERTY_TYPES,
} from '../shared/property-taxonomy';
import {
  buildCanonicalCorePropertyDetails,
  validateCorePropertyInformation,
} from '../shared/core-property-information';
import { listingActionToIntent } from '../shared/listing-types';
import {
  LEGACY_STEP4_PROPERTY_DETAIL_KEYS,
  normalizeFeaturesContext,
  validateFeaturesContext,
} from '../shared/features-context';
import {
  buildPricingContract,
  getPrimaryPrice,
  validatePricingContract,
} from '../shared/pricing-contract';
import { getPrimaryListingImage } from '../shared/listing-media';
import {
  LOCATION_CONFIRMATION_STATES,
  LOCATION_COORDINATE_SOURCES,
  PUBLIC_LOCATION_PRECISIONS,
  privateAddressSchema,
} from '../shared/location-contract';
import {
  createListingMediaUploadToken,
  confirmListingMediaUploadToken,
  isExistingListingMediaToken,
  verifyListingMediaUploadToken,
} from './services/listingMediaAuthority';
import {
  normalizePropertyPresentation,
  type PresentationMediaLike,
} from '../shared/property-presentation';
import {
  buildLocalMediaPublicUrl,
  buildLocalMediaUploadUrl,
  createLocalMediaKey,
  getMediaStorageAdapter,
  resolveMediaDeliveryUrl,
} from './_core/mediaStorage';

// Helper to normalize placeId vs locationId logic
async function normalizeLocationInput(inputLocation: { placeId?: string; locationId?: number }) {
  let sanitizedPlaceId: string | null = inputLocation.placeId ?? null;
  let resolvedLocationId: number | null = inputLocation.locationId ?? null;

  if (sanitizedPlaceId && /^\d+$/.test(sanitizedPlaceId)) {
    // Numeric placeId = locations.id, move to location_id
    resolvedLocationId = Number(sanitizedPlaceId);
    sanitizedPlaceId = null;
  }

  // If we got a numeric location id, validate it exists
  if (resolvedLocationId != null) {
    const dbInstance = await db.getDb();
    const exists = await dbInstance
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.id, resolvedLocationId))
      .limit(1);

    if (exists.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid location_id: ${resolvedLocationId}. Location does not exist.`,
      });
    }
  }

  // If we have a real Google placeId, resolve to a location_id if possible
  if (sanitizedPlaceId && resolvedLocationId === null) {
    const dbInstance = await db.getDb();
    const found = await dbInstance
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.placeId, sanitizedPlaceId))
      .limit(1);

    if (found.length > 0) {
      resolvedLocationId = found[0].id; // Resolve to internal ID
    }
  }

  return { sanitizedPlaceId, resolvedLocationId };
}

const LISTING_LIFECYCLE_ERROR_PATTERNS = [
  /^Listing is already published$/,
  /^Listing cannot be approved from status ".+"$/,
  /^Listing cannot be rejected from status ".+"$/,
];

function mapListingLifecycleError(error: unknown, fallbackMessage: string): TRPCError {
  if (error instanceof TRPCError) return error;

  if (error instanceof ListingPublicationEntitlementError) {
    return new TRPCError({ code: 'PRECONDITION_FAILED', message: error.message });
  }

  const message = error instanceof Error ? error.message : '';
  if (message === 'Listing not found') {
    return new TRPCError({ code: 'NOT_FOUND', message });
  }

  if (LISTING_LIFECYCLE_ERROR_PATTERNS.some(pattern => pattern.test(message))) {
    return new TRPCError({ code: 'BAD_REQUEST', message });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: fallbackMessage,
  });
}

const hasContractValue = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  (typeof value !== 'number' || Number.isFinite(value)) &&
  !(typeof value === 'string' && value.trim() === '');

const fillMissing = (target: Record<string, any>, key: string, value: unknown) => {
  if (hasContractValue(target[key]) || !hasContractValue(value)) return;
  target[key] = value;
};

function normalizePropertyDetailsForPublicContract(
  propertyDetails: Record<string, any> | null | undefined,
  pricing: Record<string, any> | null | undefined,
  action?: string,
  propertyType?: string,
) {
  const normalized = { ...(propertyDetails || {}) };

  const pricingContract = buildPricingContract(action, pricing, normalized, {
    preferEmbedded: false,
  });
  if (pricingContract) normalized.pricingContract = pricingContract;

  // New writes have one versioned pricing authority. Historical aliases are
  // handled only as read compatibility by buildPricingContract.
  for (const key of ['levies', 'leviesHoaOperatingCosts', 'ratesAndTaxes', 'ratesTaxes']) {
    delete normalized[key];
  }

  const parkingValue = normalized.parkingCount ?? normalized.parkingBays;
  fillMissing(normalized, 'parkingCount', parkingValue);
  fillMissing(normalized, 'parkingBays', parkingValue);

  const securityValue = normalized.security ?? normalized.securityLevel;
  fillMissing(normalized, 'security', securityValue);
  fillMissing(normalized, 'securityLevel', securityValue);

  const flooringValue = normalized.flooring ?? normalized.flooringType;
  fillMissing(normalized, 'flooring', flooringValue);
  fillMissing(normalized, 'flooringType', flooringValue);

  if (
    !hasContractValue(normalized.prepaidElectricity) &&
    String(normalized.electricitySupply || '').toLowerCase() === 'prepaid'
  ) {
    normalized.prepaidElectricity = true;
  }

  if (
    !hasContractValue(normalized.fibreReady) &&
    String(normalized.internetAccess || '').toLowerCase() === 'fibre'
  ) {
    normalized.fibreReady = true;
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'featuresContext')) {
    const canonicalFeaturesContext = normalizeFeaturesContext(
      normalized.featuresContext,
      normalized,
    );
    for (const key of LEGACY_STEP4_PROPERTY_DETAIL_KEYS) {
      if (key !== 'featuresContext') delete normalized[key];
    }
    normalized.featuresContext = canonicalFeaturesContext;
  }

  // Rebuild the canonical Step 3 object at the server boundary as well. This
  // prevents a direct API caller from bypassing the wizard's typed payload
  // mapping while retaining legacy flat aliases for existing consumers.
  Object.assign(normalized, buildCanonicalCorePropertyDetails(propertyType as any, normalized));

  if (normalized.propertyPresentation !== undefined) {
    try {
      normalized.propertyPresentation = normalizePropertyPresentation(
        normalized.propertyPresentation,
      );
    } catch (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Property presentation is not valid.',
      });
    }
  }

  return normalized;
}

function assertPropertyPresentationMediaReferences(
  propertyDetails: Record<string, any>,
  availableMedia: PresentationMediaLike[] | undefined,
) {
  const presentation = normalizePropertyPresentation(propertyDetails.propertyPresentation);
  if (!presentation || presentation.media.length === 0) return;

  const allowed = new Set(
    (availableMedia || []).flatMap(media => {
      const ids = media.id == null ? [] : [String(media.id), `existing:${String(media.id)}`];
      return [...ids, media.url, media.originalUrl].filter((value): value is string =>
        Boolean(value && value.trim()),
      );
    }),
  );

  for (const item of presentation.media) {
    if (!allowed.has(item.mediaId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Property presentation references media that is not part of this listing.',
      });
    }
  }
}

// Validation schemas
const listingActionSchema = z.enum(['sell', 'rent', 'auction']);
const propertyTypeSchema = z.enum(LISTING_PROPERTY_TYPES);

const listingMediaInputSchema = z.object({
  // Existing media uses `existing:<listing_media.id>`; new uploads use their
  // durable storage key. The prefix keeps an update from accepting a foreign
  // listing-media record as though it were a new upload.
  id: z.string().min(1),
  mediaType: z.enum(['image', 'video', 'floorplan', 'pdf']),
  uploadToken: z.string().min(1).optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  fileSize: z.number().int().nonnegative().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  previewUrl: z.string().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  duration: z.number().int().nonnegative().optional().nullable(),
  orientation: z.enum(['vertical', 'horizontal', 'square']).optional().nullable(),
  processingStatus: z.enum(['pending', 'processing', 'completed', 'failed']).optional().nullable(),
});

type ListingMediaInput = z.infer<typeof listingMediaInputSchema>;

/**
 * Convert client media references into a server-authorized manifest. Existing
 * rows are represented by listing-scoped `existing:<id>` tokens and are
 * checked again by replaceListingMedia. New storage keys must carry a
 * server-issued, confirmed upload token bound to the authenticated user.
 */
async function authorizeListingMediaManifest(
  media: ListingMediaInput[] | undefined,
  mediaIds: string[] | undefined,
  userId: number,
  listingId?: number,
): Promise<ListingMediaInput[] | undefined> {
  if (!media?.length) {
    if (mediaIds && mediaIds.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Media must be submitted with a confirmed upload manifest.',
      });
    }
    return media;
  }

  const normalized: ListingMediaInput[] = [];
  for (const item of media) {
    if (isExistingListingMediaToken(item.id)) {
      if (listingId === undefined) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Existing listing media cannot be attached to a new listing.',
        });
      }
      normalized.push({ ...item, uploadToken: null });
      continue;
    }

    if (!item.uploadToken) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Every new media item must be uploaded and confirmed before submission.',
      });
    }

    let token;
    try {
      token = verifyListingMediaUploadToken(item.uploadToken, {
        userId,
        key: item.id,
        mediaType: item.mediaType,
        requireConfirmed: true,
      });
    } catch (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Invalid media upload confirmation.',
      });
    }

    if (token.listingId !== null && token.listingId !== listingId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Media upload is bound to a different listing.',
      });
    }

    normalized.push({
      ...item,
      mediaType: token.mediaType,
      fileName: token.fileName,
      fileSize: token.fileSize,
      // Processing metadata is server-owned for direct uploads. A successful
      // confirmation is the only state accepted into listing authority.
      processingStatus: 'completed',
      // The signed reservation is authorization evidence, not listing data.
      uploadToken: null,
    });
  }

  return normalized;
}

function remapRevisionMediaToken(mediaId: string, mediaIdMap: Map<number, number>) {
  if (!isExistingListingMediaToken(mediaId)) return mediaId;
  const sourceMediaId = Number(mediaId.slice('existing:'.length));
  const revisionMediaId = mediaIdMap.get(sourceMediaId);
  if (!revisionMediaId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Listing revision references media that is not part of the approved listing.',
    });
  }
  return `existing:${revisionMediaId}`;
}

function remapRevisionPropertyDetails(
  propertyDetails: Record<string, any>,
  mediaIdMap: Map<number, number>,
) {
  const presentation = normalizePropertyPresentation(propertyDetails.propertyPresentation);
  if (!presentation) return propertyDetails;

  return {
    ...propertyDetails,
    propertyPresentation: {
      ...presentation,
      media: presentation.media.map(item => ({
        ...item,
        mediaId: remapRevisionMediaToken(item.mediaId, mediaIdMap),
      })),
    },
  };
}

const createListingSchemaBase = z.object({
  action: listingActionSchema,
  propertyType: propertyTypeSchema,
  title: z.string().min(10).max(255),
  description: z.string().min(50).max(5000),
  pricing: z.object({
    // Sell fields
    askingPrice: z.number().optional(),
    negotiable: z.boolean().optional(),
    negotiability: z.enum(['negotiable', 'not_negotiable', 'unknown']).optional(),
    transferCostEstimate: z.number().nullable().optional(),
    levies: z.number().optional(),
    ratesAndTaxes: z.number().optional(),
    recurringCosts: z.record(z.string(), z.any()).optional(),
    // Rent fields
    monthlyRent: z.number().optional(),
    deposit: z.number().optional(),
    depositFact: z.record(z.string(), z.any()).optional(),
    leaseTerms: z.string().optional(),
    availableFrom: z.date().optional(),
    utilitiesIncluded: z.boolean().optional(),
    // Auction fields
    startingBid: z.number().optional(),
    reservePrice: z.number().optional(),
    auctionDateTime: z.date().optional(),
    auctionTermsDocumentUrl: z.string().optional(),
  }),
  propertyDetails: z.record(z.string(), z.any()),
  location: z.object({
    address: z.string().max(500).optional().default(''),
    latitude: z.number().finite().nullable().optional(),
    longitude: z.number().finite().nullable().optional(),
    city: z.string().max(150),
    suburb: z.string().max(200).optional(),
    province: z.string().max(100),
    postalCode: z.string().max(20).optional(),
    placeId: z.string().optional(),
    locationId: z.number().optional(), // Added for internal Location ID support
    providerLocationPlaceId: z.string().max(255).nullable().optional(),
    provider: z.string().max(32).nullable().optional(),
    provinceId: z.number().int().positive().nullable().optional(),
    cityId: z.number().int().positive().nullable().optional(),
    suburbId: z.number().int().positive().nullable().optional(),
    privateAddress: privateAddressSchema.nullable().optional(),
    coordinateSource: z.enum(LOCATION_COORDINATE_SOURCES).nullable().optional(),
    locationConfirmationState: z.enum(LOCATION_CONFIRMATION_STATES).optional(),
    publicLocationPrecision: z.enum(PUBLIC_LOCATION_PRECISIONS).optional(),
    // Google Places address components for auto-population
    addressComponents: z
      .array(
        z.object({
          long_name: z.string(),
          short_name: z.string(),
          types: z.array(z.string()),
        }),
      )
      .optional(),
  }),
  // Use string IDs only
  mediaIds: z.array(z.string()),
  // Use string ID or undefined
  mainMediaId: z.string().optional().nullable(),
  // Optional during the transition from the legacy mediaIds-only contract.
  // New wizard submissions use this typed canonical media manifest.
  media: z.array(listingMediaInputSchema).optional(),
  status: z.enum(['draft', 'pending_review']).optional(),
  sellerProspectId: z.number().int().positive().optional(),
});

const createListingSchema = createListingSchemaBase.superRefine((input, context) => {
  const message = getListingAuthoringValidationMessage(input.action, input.propertyType);
  if (message) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['propertyType'],
      message,
    });
  }

  const featureIssues = validateFeaturesContext(
    input.propertyDetails.featuresContext,
    listingActionToIntent(input.action),
    input.propertyType,
    input.propertyDetails.corePropertyInformation,
  );
  for (const issue of featureIssues) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['propertyDetails', 'featuresContext', ...issue.field.split('.')],
      message: issue.message,
    });
  }

  const pricingIssues = validatePricingContract(
    input.action,
    input.pricing,
    input.propertyDetails,
    { mode: 'draft', enforceInputShape: true },
  );
  for (const issue of pricingIssues) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pricing', ...issue.field.split('.')],
      message: issue.message,
    });
  }
});

export const listingRouter = router({
  /**
   * Create new listing
   */
  create: protectedProcedure.input(createListingSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    try {
      const sellerProspectId = input.sellerProspectId;
      const sellerProspectConversion =
        sellerProspectId !== undefined
          ? await (async () => {
              const database = await db.getDb();
              if (!database) {
                throw new TRPCError({
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'Database not available',
                });
              }
              return prepareSellerProspectListingConversion(
                database,
                requireUser(ctx),
                sellerProspectId,
              );
            })()
          : undefined;

      // Generate slug from title
      const timestamp = Date.now().toString(36);
      const slug =
        input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') + `-${timestamp}`;

      const authorizedMedia = await authorizeListingMediaManifest(
        input.media,
        input.mediaIds,
        userId,
      );

      // The typed manifest preserves video/floorplan/document semantics. New
      // media is accepted only after the upload-token boundary above.
      const media = authorizedMedia?.length
        ? authorizedMedia.map((item, index) => ({
            id: item.id,
            url: item.id,
            type: item.mediaType,
            displayOrder: index,
            isPrimary: input.mainMediaId ? item.id === input.mainMediaId : false,
            processingStatus: 'completed' as const,
            thumbnailUrl: item.thumbnailUrl || null,
            previewUrl: item.previewUrl || null,
            fileName: item.fileName || null,
            fileSize: item.fileSize || null,
            width: item.width || null,
            height: item.height || null,
            duration: item.duration || null,
            orientation: item.orientation || null,
          }))
        : [];

      let resolvedLocation;
      try {
        resolvedLocation = await resolveCanonicalListingLocation({
          ...input.location,
          address: input.location.address || null,
          providerLocationPlaceId: input.location.providerLocationPlaceId || null,
          provider: input.location.provider || null,
          privateAddress: input.location.privateAddress || null,
          locationConfirmationState: input.location.locationConfirmationState,
          publicLocationPrecision: input.location.publicLocationPrecision,
          propertyType: input.propertyType,
        });
      } catch (error) {
        if (error instanceof ListingLocationResolutionError) {
          if (input.status !== 'pending_review') {
            console.warn('[ListingRouter] Draft location remains unresolved:', error.message);
            resolvedLocation = buildUnresolvedDraftLocation({
              ...input.location,
              propertyType: input.propertyType,
            });
          } else {
            throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
          }
        } else if (input.status !== 'pending_review') {
          console.warn('[ListingRouter] Draft location resolver unavailable:', error);
          resolvedLocation = buildUnresolvedDraftLocation({
            ...input.location,
            propertyType: input.propertyType,
          });
        } else {
          throw error;
        }
      }

      // GUARD: Normalize placeId and validate location_id
      const { sanitizedPlaceId, resolvedLocationId } = await normalizeLocationInput(input.location);
      const persistedLocation = buildListingLocationPersistence(resolvedLocation);
      const propertyDetails = normalizePropertyDetailsForPublicContract(
        input.propertyDetails,
        input.pricing,
        input.action,
        input.propertyType,
      );
      assertPropertyPresentationMediaReferences(propertyDetails, authorizedMedia);

      // Create listing in database with auto-populated location IDs
      const listingId = await db.createListing({
        userId,
        action: input.action,
        propertyType: input.propertyType,
        title: input.title,
        description: input.description,
        pricing: input.pricing,
        propertyDetails,
        address: persistedLocation.address,
        latitude: persistedLocation.latitude,
        longitude: persistedLocation.longitude,
        city: persistedLocation.city,
        suburb: persistedLocation.suburb,
        province: persistedLocation.province,
        postalCode: persistedLocation.postalCode,
        placeId: sanitizedPlaceId,
        locationId: resolvedLocationId, // New: Direct location_id if from numeric placeId
        provinceId: persistedLocation.provinceId,
        cityId: persistedLocation.cityId,
        suburbId: persistedLocation.suburbId,
        privateAddress: persistedLocation.privateAddress,
        coordinateSource: persistedLocation.coordinateSource,
        locationConfirmationState: persistedLocation.locationConfirmationState,
        publicLocationPrecision: persistedLocation.publicLocationPrecision,
        slug,
        media,
        sellerProspectConversion,
      });

      // Calculate initial readiness
      const listingData = { ...input, media };
      const readiness = calculateListingReadiness(listingData);
      await db.updateListing(listingId, { readinessScore: readiness.score });

      // Set approval status based on account verification
      // For now, we'll put it in draft status
      const canonicalUrl = `/listings/${slug}`;

      await recordAgentOsEvent({
        userId,
        eventType: 'agent_listing_created',
        eventData: {
          listingId,
          slug,
          status: 'draft',
          action: input.action,
          propertyType: input.propertyType,
        },
        req: ctx.req,
        requestId: ctx.requestId,
      });

      return {
        id: listingId,
        slug,
        status: 'draft',
        canonicalUrl,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error creating listing:', error);
      // Re-throw TRPC errors
      if (error instanceof TRPCError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error message:', errorMessage);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create listing: ${errorMessage}`,
        cause: error,
      });
    }
  }),

  /**
   * Update existing listing
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        ...createListingSchemaBase.partial().shape,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        // Verify ownership
        const listing = await db.getListingById(input.id);
        if (!listing || listing.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to update this listing',
          });
        }

        const taxonomyChanged =
          (input.action !== undefined && input.action !== listing.action) ||
          (input.propertyType !== undefined && input.propertyType !== listing.propertyType);
        const nextPropertyType = input.propertyType ?? listing.propertyType;
        if (taxonomyChanged) {
          const nextAction = input.action ?? listing.action;
          const taxonomyMessage = getListingAuthoringValidationMessage(
            nextAction,
            nextPropertyType,
          );
          if (taxonomyMessage) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: taxonomyMessage });
          }
        }

        if (input.propertyDetails?.featuresContext !== undefined) {
          const featureIssues = validateFeaturesContext(
            input.propertyDetails.featuresContext,
            listingActionToIntent(input.action ?? listing.action),
            nextPropertyType,
            input.propertyDetails.corePropertyInformation ??
              (listing.propertyDetails as any)?.corePropertyInformation,
          );
          if (featureIssues.length > 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: featureIssues.map(issue => issue.message).join(' '),
            });
          }
        }

        const pricingIssues = validatePricingContract(
          input.action ?? listing.action,
          input.pricing ?? (listing.pricing as any),
          input.propertyDetails ?? (listing.propertyDetails as any) ?? {},
          {
            mode: 'draft',
            enforceInputShape: input.pricing !== undefined,
          },
        );
        if (pricingIssues.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: pricingIssues.map(issue => issue.message).join(' '),
          });
        }

        const requiresReviewBeforePublicUpdate =
          listing.status === 'published' || listing.status === 'approved';

        // GUARD: Normalize placeId and validate location_id (if location is being updated)
        const {
          id: _id,
          media: rawMediaManifest,
          mediaIds: rawMediaIds,
          mainMediaId,
          sellerProspectId: _sellerProspectId,
          status: requestedStatus,
          ...listingInput
        } = input;

        const mediaManifest = await authorizeListingMediaManifest(
          rawMediaManifest,
          rawMediaIds,
          userId,
          input.id,
        );
        let targetListingId = input.id;
        let targetMediaManifest = mediaManifest;
        let targetMainMediaId = mainMediaId;

        // Status changes are lifecycle transitions, not editable listing data.
        // Legacy clients may echo the current status, but cannot promote a
        // draft to pending review or published through update.
        if (requestedStatus !== undefined && requestedStatus !== listing.status) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Listing status is controlled by the review workflow.',
          });
        }
        const updatePayload: any = { ...listingInput, updatedAt: new Date() };

        if (input.propertyDetails || input.pricing) {
          updatePayload.propertyDetails = normalizePropertyDetailsForPublicContract(
            input.propertyDetails || ((listing.propertyDetails as any) ?? {}),
            input.pricing || null,
            input.action ?? listing.action,
            nextPropertyType,
          );
        }

        if (updatePayload.propertyDetails?.propertyPresentation) {
          const availableMedia =
            mediaManifest ||
            (await db.getListingMedia(input.id)).map(item => ({
              id: item.id,
              originalUrl: item.originalUrl,
              url: item.processedUrl || item.originalUrl,
              mediaType: item.mediaType,
            }));
          assertPropertyPresentationMediaReferences(updatePayload.propertyDetails, availableMedia);
        }

        if (input.location) {
          let resolvedLocation;
          try {
            resolvedLocation = await resolveCanonicalListingLocation({
              ...input.location,
              address: input.location.address || null,
              providerLocationPlaceId: input.location.providerLocationPlaceId || null,
              provider: input.location.provider || null,
              privateAddress: input.location.privateAddress || null,
              propertyType: nextPropertyType,
            });
          } catch (error) {
            if (error instanceof ListingLocationResolutionError) {
              if (listing.status !== 'draft') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
              }
              console.warn(
                '[ListingRouter] Draft location remains unresolved during update:',
                error.message,
              );
              resolvedLocation = buildUnresolvedDraftLocation({
                ...input.location,
                propertyType: nextPropertyType,
              });
            } else if (listing.status !== 'draft') {
              throw error;
            } else {
              console.warn(
                '[ListingRouter] Draft location resolver unavailable during update:',
                error,
              );
              resolvedLocation = buildUnresolvedDraftLocation({
                ...input.location,
                propertyType: nextPropertyType,
              });
            }
          }

          const { sanitizedPlaceId, resolvedLocationId } = await normalizeLocationInput(
            input.location,
          );
          const preparedLocationUpdate = prepareListingLocationUpdate(
            listing as Record<string, unknown>,
            resolvedLocation,
            input.location.locationConfirmationState === 'confirmed' &&
              Boolean(resolvedLocation.coordinateSource),
          );
          const locationToPersist = preparedLocationUpdate.location;

          updatePayload.address = locationToPersist.address;
          updatePayload.latitude =
            locationToPersist.latitude === null ? null : locationToPersist.latitude.toFixed(7);
          updatePayload.longitude =
            locationToPersist.longitude === null ? null : locationToPersist.longitude.toFixed(7);
          updatePayload.city = locationToPersist.city;
          updatePayload.suburb = locationToPersist.suburb;
          updatePayload.province = locationToPersist.province;
          updatePayload.postalCode = locationToPersist.postalCode;
          updatePayload.placeId = sanitizedPlaceId;
          updatePayload.locationId = resolvedLocationId;
          updatePayload.provinceId = locationToPersist.provinceId;
          updatePayload.cityId = locationToPersist.cityId;
          updatePayload.suburbId = locationToPersist.suburbId;
          updatePayload.privateAddress = locationToPersist.privateAddress;
          updatePayload.coordinateSource = locationToPersist.coordinateSource;
          updatePayload.locationConfirmationState = locationToPersist.locationConfirmationState;
          updatePayload.publicLocationPrecision = locationToPersist.publicLocationPrecision;

          // Remove nested location object strictly to avoid Drizzle schema errors.
          delete updatePayload.location;
        }

        if (requiresReviewBeforePublicUpdate) {
          const database = await db.getDb();
          if (!database) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Database not available',
            });
          }
          await assertListingPublicationEntitled(database, {
            listingId: input.id,
            operation: 'republish',
          });

          const revisionContext = await db.createListingRevision(input.id);
          targetListingId = revisionContext.revisionListingId;
          targetMediaManifest = mediaManifest?.map(item => ({
            ...item,
            id: remapRevisionMediaToken(item.id, revisionContext.mediaIdMap),
          }));
          targetMainMediaId = mainMediaId
            ? remapRevisionMediaToken(mainMediaId, revisionContext.mediaIdMap)
            : mainMediaId;

          if (updatePayload.propertyDetails) {
            updatePayload.propertyDetails = remapRevisionPropertyDetails(
              updatePayload.propertyDetails,
              revisionContext.mediaIdMap,
            );
            const availableRevisionMedia =
              targetMediaManifest ||
              (await db.getListingMedia(targetListingId)).map(item => ({
                id: item.id,
                originalUrl: item.originalUrl,
                url: item.processedUrl || item.originalUrl,
                mediaType: item.mediaType,
              }));
            assertPropertyPresentationMediaReferences(
              updatePayload.propertyDetails,
              availableRevisionMedia,
            );
          }
        }

        // Update listing
        await db.updateListing(targetListingId, updatePayload);

        if (targetMediaManifest !== undefined) {
          await db.replaceListingMedia(targetListingId, targetMediaManifest, targetMainMediaId);
        }

        if (requiresReviewBeforePublicUpdate) {
          await db.submitListingForReview(targetListingId);
        } else {
          // Keep an already-public mirror deterministic. A failed projection
          // is a lifecycle error, not a warning that leaves stale public media.
          await db.syncPublishedListingMediaToPropertyMirror(targetListingId);
        }

        // Recalculate readiness and quality
        // Fetch full listing with media to ensure accuracy (or construct from input + existing)
        const fullListing = await db.getListingById(targetListingId);
        const media = await db.getListingMedia(targetListingId);
        const listingData = { ...fullListing, ...input, media }; // Merge input into full listing

        const readiness = calculateListingReadiness(listingData);
        const quality = calculateListingQualityScore(listingData);

        await db.updateListing(targetListingId, {
          readinessScore: readiness.score,
          qualityScore: quality.score,
          qualityBreakdown: quality.breakdown,
        });

        return {
          success: true,
          status: requiresReviewBeforePublicUpdate ? 'pending_review' : undefined,
        };
      } catch (error) {
        console.error('Error updating listing:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        if (error instanceof ListingPublicationEntitlementError) {
          throw mapListingLifecycleError(error, 'Failed to update listing');
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update listing' });
      }
    }),

  /**
   * Get listing by ID for private authoring/review workflows.
   * Public property detail reads must go through properties.getById.
   */
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    try {
      console.log('[listing.getById] Fetching listing ID:', input.id);
      // Fetch listing
      const listing = await db.getListingById(input.id);
      console.log('[listing.getById] Result:', listing ? `Found: ${listing.title}` : 'NOT FOUND');
      if (!listing) {
        return null; // Return null instead of throwing for consistency with properties.getById
      }

      const user = requireUser(ctx);
      const isOwner =
        Number((listing as any).userId || 0) === user.id ||
        Number((listing as any).ownerId || 0) === user.id;
      const isSuperAdmin = user.role === 'super_admin';

      if (!isOwner && !isSuperAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to view this listing',
        });
      }

      // Fetch media
      const rawMedia = await db.getListingMedia(input.id);

      // Transform media to include full URLs
      // Frontend expects 'url' field, but database has 'originalUrl'
      const media = rawMedia.map(m => {
        const presentation = normalizePropertyPresentation(
          (listing.propertyDetails as any)?.propertyPresentation,
        );
        const descriptor = presentation?.media.find(item =>
          [String(m.id), `existing:${String(m.id)}`, m.originalUrl].includes(item.mediaId),
        );
        return {
          ...m,
          url: resolveMediaDeliveryUrl(m.originalUrl),
          thumbnail: resolveMediaDeliveryUrl(m.thumbnailUrl),
          presentationKind:
            descriptor?.kind ||
            (m.mediaType === 'floorplan'
              ? 'floorplan'
              : m.mediaType === 'pdf'
                ? 'document'
                : undefined),
          presentationLabel: descriptor?.label || null,
        };
      });
      const primaryImage = getPrimaryListingImage(media as any[]);

      // Fetch agent if assigned
      let agent = null;
      if (listing.agentId) {
        agent = await db.getAgentById(listing.agentId);
      }

      // Normalize price field for PropertyDetail compatibility
      // PropertyDetail expects a single 'price' field
      const price =
        getPrimaryPrice(
          listing.action,
          listing.pricing as Record<string, unknown>,
          listing.propertyDetails as Record<string, unknown>,
        ) || 0;

      // Map listing fields to property-compatible format
      const propertyCompatibleListing = {
        ...listing,
        price, // Add normalized price field
        listingType: listing.action, // Map action → listingType for compatibility
        mainImage: primaryImage?.url || null, // Hero is always a completed image
        area: listing.propertyDetails?.size || listing.propertyDetails?.area || 0, // Fallback area
      };

      return {
        property: propertyCompatibleListing,
        images: media,
        media,
        agent,
      };
    } catch (error) {
      console.error('Error fetching listing:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch listing',
      });
    }
  }),

  /**
   * Get user's listings
   */
  myListings: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(['draft', 'pending_review', 'approved', 'published', 'rejected', 'archived'])
          .optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        // Fetch user's listings with pagination
        const listings = await db.getUserListings(userId, input.status, input.limit, input.offset);

        return listings;
      } catch (error) {
        console.error('Error fetching user listings:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch listings' });
      }
    }),

  /**
   * Archive listing
   */
  archive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        // Verify ownership
        const listing = await db.getListingById(input.id);
        if (!listing || listing.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to archive this listing',
          });
        }

        // Archive listing
        await db.archiveListing(input.id);

        return { success: true };
      } catch (error) {
        console.error('Error archiving listing:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to archive listing',
        });
      }
    }),

  /**
   * Delete listing
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      try {
        // Verify ownership or super admin status
        const listing = await db.getListingById(input.id);
        if (!listing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
        }

        const isOwner = listing.userId === userId;
        const isSuperAdmin = requireUser(ctx).role === 'super_admin';

        if (!isOwner && !isSuperAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to delete this listing',
          });
        }

        // Published inventory is customer-visible supply. Removing it must
        // preserve the source record and durable history, and must cascade
        // through the canonical source-to-public lifecycle.
        if (['published', 'approved'].includes(String(listing.status))) {
          await db.archiveListing(input.id);
          return { success: true, status: 'archived' as const };
        }

        // Private drafts and unresolved submissions may still use the legacy
        // hard-delete path until the broader revision architecture replaces it.
        await db.deleteListing(input.id);

        return { success: true };
      } catch (error) {
        console.error('Error deleting listing:', error);

        // If it's already a TRPCError, re-throw it
        if (error instanceof TRPCError) {
          throw error;
        }

        // Otherwise, wrap it with more details
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete listing';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: errorMessage,
          cause: error,
        });
      }
    }),

  /**
   * Upload media for listing
   */
  uploadMedia: protectedProcedure
    .input(
      z.object({
        listingId: z.number().optional(),
        type: z.enum(['image', 'video', 'floorplan', 'pdf']),
        filename: z.string(),
        contentType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const user = requireUser(ctx);
        if (input.listingId !== undefined) {
          const listing = await db.getListingById(input.listingId);
          const isOwner =
            listing &&
            (Number((listing as any).userId || 0) === user.id ||
              Number((listing as any).ownerId || 0) === user.id);
          if (!listing || (!isOwner && user.role !== 'super_admin')) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Not authorized to upload media for this listing',
            });
          }
        }

        const storageScope = input.listingId?.toString() || `draft-${user.id}`;
        if (getMediaStorageAdapter() === 'local') {
          const key = createLocalMediaKey(input.filename, storageScope);
          const uploadToken = createListingMediaUploadToken({
            key,
            mediaType: input.type,
            contentType: input.contentType,
            fileName: input.filename,
            userId: user.id,
            listingId: input.listingId ?? null,
          });

          return {
            uploadUrl: buildLocalMediaUploadUrl(uploadToken),
            mediaId: key,
            publicUrl: buildLocalMediaPublicUrl(key),
            uploadToken,
          };
        }

        // Import the S3 upload service only for the explicitly selected S3 adapter.
        const { generatePresignedUploadUrl } = await import('./_core/imageUpload');
        const result = await generatePresignedUploadUrl(
          input.filename,
          input.contentType,
          storageScope,
        );

        const publicUrl = resolveMediaDeliveryUrl(result.key);
        const uploadToken = createListingMediaUploadToken({
          key: result.key,
          mediaType: input.type,
          contentType: input.contentType,
          fileName: input.filename,
          userId: user.id,
          listingId: input.listingId ?? null,
        });

        return {
          uploadUrl: result.uploadUrl,
          mediaId: result.key, // Use the S3 key as media ID
          publicUrl: publicUrl || result.key,
          uploadToken,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (
          error instanceof Error &&
          /invalid|supported|content type|filename|media type/i.test(error.message)
        ) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        console.error('Error generating media upload URL:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate upload URL',
        });
      }
    }),

  /**
   * Finalize a direct upload. The storage HEAD check is the point at which a
   * presigned reservation becomes a confirmed media reference.
   */
  confirmMediaUpload: protectedProcedure
    .input(z.object({ uploadToken: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      try {
        const reservation = verifyListingMediaUploadToken(input.uploadToken, {
          userId: user.id,
          requireConfirmed: false,
        });
        const { assertUploadedMediaObject } = await import('./_core/imageUpload');
        const verifiedObject = await assertUploadedMediaObject(
          reservation.key,
          reservation.contentType,
        );
        const uploadToken = confirmListingMediaUploadToken(
          input.uploadToken,
          verifiedObject.contentLength,
        );

        return {
          uploadToken,
          mediaId: reservation.key,
          fileSize: verifiedObject.contentLength,
          contentType: verifiedObject.contentType || reservation.contentType,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Unable to confirm media upload.',
        });
      }
    }),

  /**
   * Get listing analytics
   */
  getAnalytics: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const listing = await db.getListingById(input.listingId);
        if (!listing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
        }

        // Fetch analytics
        const analytics = await db.getListingAnalytics(input.listingId);

        if (!analytics) {
          // Return default analytics if none exist
          return {
            totalViews: 0,
            uniqueVisitors: 0,
            totalLeads: 0,
            contactFormLeads: 0,
            whatsappClicks: 0,
            phoneReveals: 0,
            bookingViewingRequests: 0,
            totalFavorites: 0,
            totalShares: 0,
            conversionRate: 0,
            viewsByDay: {},
            trafficSources: {
              direct: 0,
              organic: 0,
              social: 0,
              referral: 0,
              email: 0,
              paid: 0,
            },
          };
        }

        return analytics;
      } catch (error) {
        console.error('Error fetching analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch analytics',
        });
      }
    }),

  /**
   * Get listing leads
   */
  getLeads: protectedProcedure
    .input(
      z
        .object({
          listingId: z.number().optional(),
          propertyId: z.number().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .refine(input => input.listingId || input.propertyId, {
          message: 'Either listingId or propertyId is required',
        }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const dbInstance = await db.getDb();
        const currentUserId = requireUser(ctx).id;

        const [agentRecord] = await dbInstance
          .select({ id: agents.id })
          .from(agents)
          .where(eq(agents.userId, currentUserId))
          .limit(1);

        let propertyId = input.propertyId ?? null;

        if (propertyId != null) {
          const [property] = await dbInstance
            .select({
              id: properties.id,
              ownerId: properties.ownerId,
              agentId: properties.agentId,
            })
            .from(properties)
            .where(eq(properties.id, propertyId))
            .limit(1);

          if (!property) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
          }

          const isOwner = property.ownerId === currentUserId;
          const isAssignedAgent = !!agentRecord && property.agentId === agentRecord.id;

          if (!isOwner && !isAssignedAgent) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to view leads' });
          }
        } else if (input.listingId != null) {
          const listing = await db.getListingById(input.listingId);
          if (!listing) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
          }

          const isOwner = listing.userId === currentUserId || listing.ownerId === currentUserId;
          const isAssignedAgent = !!agentRecord && listing.agentId === agentRecord.id;

          if (!isOwner && !isAssignedAgent) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to view leads' });
          }

          // Published inventory lives in properties, while drafts and pending review listings
          // do not have public enquiries yet.
          const resolvedInventory = await resolvePropertyForListing(dbInstance, {
            id: listing.id,
            ownerId: listing.ownerId,
            agentId: listing.agentId ?? null,
            title: listing.title,
            address: listing.address,
            city: listing.city,
            province: listing.province,
            status: listing.status,
          });

          propertyId = resolvedInventory.propertyId;
        }

        if (!propertyId) {
          return {
            leads: [],
            total: 0,
            propertyId: null,
          };
        }

        const [leadRows, totalRows] = await Promise.all([
          dbInstance
            .select({
              id: leads.id,
              name: leads.name,
              email: leads.email,
              phone: leads.phone,
              message: leads.message,
              status: leads.status,
              leadType: leads.leadType,
              source: leads.source,
              leadSource: leads.leadSource,
              qualificationStatus: leads.qualificationStatus,
              funnelStage: leads.funnelStage,
              createdAt: leads.createdAt,
              propertyId: leads.propertyId,
              developmentId: leads.developmentId,
              agentId: leads.agentId,
              agencyId: leads.agencyId,
            })
            .from(leads)
            .where(eq(leads.propertyId, propertyId))
            .orderBy(desc(leads.createdAt))
            .limit(input.limit)
            .offset(input.offset),
          dbInstance.select({ total: count() }).from(leads).where(eq(leads.propertyId, propertyId)),
        ]);

        return {
          leads: leadRows,
          total: totalRows[0]?.total ?? 0,
          propertyId,
        };
      } catch (error) {
        console.error('Error fetching leads:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch leads' });
      }
    }),

  /**
   * Preflight requirements before starting/submitting listing flow.
   * Used by the wizard UI to show explicit blockers early.
   */
  getSubmissionPreflight: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = requireUser(ctx);
    const agent = await db.getAgentByUserId(currentUser.id);
    const owner = await db.getUserById(currentUser.id);

    const whatsappValue =
      String(agent?.whatsapp || '').trim() ||
      String(agent?.phone || '').trim() ||
      String(owner?.phone || '').trim();

    const blockers: Array<{
      code: string;
      message: string;
      actionLabel: string;
      actionPath: string;
    }> = [];

    if (!whatsappValue) {
      blockers.push({
        code: 'missing_whatsapp_contact',
        message:
          'Add a WhatsApp-ready contact number before you start listing. This is required for submission.',
        actionLabel: 'Update Contact Details',
        actionPath: '/agent/settings',
      });
    }

    // Publication readiness enumeration: surface every canonical blocker
    // (verification, profile, branding, subscription, capacity) BEFORE the
    // agency invests authoring effort, instead of failing at submit time.
    let publication:
      | {
          ready: boolean;
          blockers: Array<{ reason: string; message: string }>;
          verified: boolean;
          daysRemaining: number | null;
          capacity: { used: number; max: number } | null;
        }
      | null = null;

    if (currentUser.role === 'agency_admin' && currentUser.agencyId) {
      const readiness = await evaluateAgencyPublicationReadiness(db, Number(currentUser.agencyId), {
        includeCapacityCount: true,
      });
      publication = {
        ready: readiness.ready,
        blockers: readiness.blockers.map(({ reason, message }) => ({ reason, message })),
        verified: readiness.facts.verified,
        daysRemaining: readiness.facts.daysRemaining,
        capacity:
          readiness.facts.capacityUsed !== null && readiness.facts.capacityMax !== null
            ? { used: readiness.facts.capacityUsed, max: readiness.facts.capacityMax }
            : null,
      };

      if (!readiness.facts.verified) {
        blockers.push({
          code: 'agency_unverified',
          message:
            'Your agency must be verified by Property Listify before listings can be submitted for publication.',
          actionLabel: 'Contact Property Listify',
          actionPath: '/contact',
        });
      }

      if (
        publication.capacity &&
        publication.capacity.max > 0 &&
        publication.capacity.used >= publication.capacity.max
      ) {
        blockers.push({
          code: 'listing_capacity_exhausted',
          message: `Your plan allows ${publication.capacity.max} active listings and the capacity is fully used. Archive an active listing or upgrade before starting another.`,
          actionLabel: 'Open Billing Workspace',
          actionPath: '/agency/billing',
        });
      }
    }

    return {
      canStartListing: blockers.length === 0,
      blockers,
      contact: {
        whatsapp: String(agent?.whatsapp || '').trim(),
        phone: String(agent?.phone || owner?.phone || '').trim(),
      },
      publication,
    };
  }),

  /**
   * Submit listing for review (manual approval)
   */
  submitForReview: protectedProcedure
    .input(z.object({ listingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = requireUser(ctx);
      const recordSubmitFailure = async (
        reasonCode: string,
        message: string,
        details?: Record<string, unknown>,
      ) => {
        await recordAgentOsEvent({
          userId: currentUser.id,
          eventType: 'agent_listing_submit_failed',
          eventData: {
            listingId: input.listingId,
            reasonCode,
            message,
            ...(details || {}),
          },
          req: ctx.req,
          requestId: ctx.requestId,
        });
      };

      try {
        // Verify ownership
        const listing = await db.getListingById(input.listingId);
        if (!listing || listing.userId !== currentUser.id) {
          await recordSubmitFailure(
            'not_authorized_or_listing_missing',
            'Not authorized to submit this listing',
          );
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to submit this listing',
          });
        }

        // Check readiness before allowing submission
        const fullListing = await db.getListingById(input.listingId);
        const media = await db.getListingMedia(input.listingId);

        if (fullListing.action === 'sell' || fullListing.action === 'rent') {
          const locationIssues = validateListingRecordLocation(
            fullListing as Record<string, unknown>,
          );
          if (locationIssues.length > 0) {
            const message = locationIssues.join(' ');
            await recordSubmitFailure('invalid_location', message, {
              fields: ['location'],
            });
            throw new TRPCError({ code: 'BAD_REQUEST', message });
          }

          const pricingIssues = validatePricingContract(
            fullListing.action,
            fullListing.pricing as Record<string, unknown>,
            fullListing.propertyDetails as Record<string, unknown>,
            { mode: 'publish', enforceInputShape: false },
          );
          if (pricingIssues.length > 0) {
            const message = pricingIssues.map(issue => issue.message).join(' ');
            await recordSubmitFailure('invalid_pricing', message, {
              fields: pricingIssues.map(issue => issue.field),
            });
            throw new TRPCError({ code: 'BAD_REQUEST', message });
          }

          const featureIssues = validateFeaturesContext(
            (fullListing.propertyDetails as any)?.featuresContext,
            fullListing.action === 'sell' ? 'sale' : 'rent',
            fullListing.propertyType,
            (fullListing.propertyDetails as any)?.corePropertyInformation,
          );
          if (featureIssues.length > 0) {
            const message = featureIssues.map(issue => issue.message).join(' ');
            await recordSubmitFailure('invalid_features_context', message, {
              fields: featureIssues.map(issue => issue.field),
            });
            throw new TRPCError({ code: 'BAD_REQUEST', message });
          }

          const coreIssues = validateCorePropertyInformation(
            fullListing.action === 'sell' ? 'sale' : 'rent',
            fullListing.propertyType,
            fullListing.propertyDetails,
          );
          if (coreIssues.length > 0) {
            const message = coreIssues.map(issue => issue.message).join(' ');
            await recordSubmitFailure('invalid_core_property_information', message, {
              fields: coreIssues.map(issue => issue.field),
            });
            throw new TRPCError({ code: 'BAD_REQUEST', message });
          }
        }

        const readiness = calculateListingReadiness({ ...fullListing, media });

        if (readiness.score < 75) {
          // Threshold 75%
          await recordSubmitFailure(
            'readiness_below_threshold',
            `Listing readiness ${readiness.score}% is below required 75%`,
            {
              readinessScore: readiness.score,
              missing: Array.isArray((readiness as any).missing) ? (readiness as any).missing : [],
            },
          );
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Listing is not ready for submission (${readiness.score}%). Please complete missing fields.`,
          });
        }

        const database = await db.getDb();
        if (!database) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        }
        const originalListingId = Number((fullListing as any).revisionOfListingId || 0);
        await assertListingPublicationEntitled(database, {
          listingId: input.listingId,
          operation: 'submit',
          ...(originalListingId > 0 ? { excludeListingIds: [originalListingId] } : {}),
        });

        const agent = await db.getAgentByUserId(currentUser.id);
        const owner = await db.getUserById(currentUser.id);
        const whatsappContact =
          String(agent?.whatsapp || '').trim() ||
          String(agent?.phone || '').trim() ||
          String(owner?.phone || '').trim();

        if (!whatsappContact) {
          await recordSubmitFailure(
            'missing_whatsapp_contact',
            'WhatsApp contact number is required before listing submission',
            {
              agentId: agent?.id || null,
            },
          );
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message:
              'A WhatsApp contact number is required before this listing can go live. Add a WhatsApp-ready number to your profile and try again.',
          });
        }

        // --- Fast-Track Approval Logic (Phase 5) ---
        // Criteria: Readiness 100%, Quality >= 85, Trusted/Verified Agent
        const quality = calculateListingQualityScore({ ...fullListing, media });

        // Check if agent is verified (assuming isVerified is 1 or true)
        const isTrusted = agent?.isVerified === 1;

        if (readiness.score === 100 && quality.score >= 85 && isTrusted) {
          // Auto-Approve
          await db.approveListing(
            input.listingId,
            requireUser(ctx).id,
            'Fast-Track Auto Approval (High Quality & Trusted)',
            'fast_track',
          );
          await recordAgentOsEvent({
            userId: requireUser(ctx).id,
            eventType: 'agent_listing_submitted',
            eventData: {
              listingId: input.listingId,
              status: 'approved',
              fastTracked: true,
            },
            req: ctx.req,
            requestId: ctx.requestId,
          });
          await recordAgentOsEvent({
            userId: requireUser(ctx).id,
            eventType: 'agent_listing_live',
            eventData: {
              listingId: input.listingId,
              source: 'fast_track_approval',
            },
            req: ctx.req,
            requestId: ctx.requestId,
          });
          return { success: true, status: 'approved', fastTracked: true };
        }

        // Otherwise, add to manual review queue
        await db.submitListingForReview(input.listingId);
        await recordAgentOsEvent({
          userId: requireUser(ctx).id,
          eventType: 'agent_listing_submitted',
          eventData: {
            listingId: input.listingId,
            status: 'pending_review',
            fastTracked: false,
          },
          req: ctx.req,
          requestId: ctx.requestId,
        });

        return { success: true, status: 'pending_review' };
      } catch (error) {
        console.error('Error submitting for review:', error);

        if (!(error instanceof TRPCError)) {
          await recordSubmitFailure(
            'unexpected_submission_error',
            error instanceof Error ? error.message : 'Failed to submit for review',
          );
        }

        if (error instanceof TRPCError) throw error;
        if (error instanceof ListingPublicationEntitlementError) {
          throw mapListingLifecycleError(error, 'Failed to submit for review');
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit for review',
        });
      }
    }),

  /**
   * Promote/Feature a listing (Soft Monetization Hook)
   * Requires Quality Score >= 85
   */
  promote: protectedProcedure
    .input(
      z.object({
        listingId: z.number(),
        featured: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership or admin
        const listing = await db.getListingById(input.listingId);
        if (!listing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });

        const isOwner = listing.userId === ctx.user?.id;
        const isSuperAdmin = ctx.user?.role === 'super_admin';

        if (!isOwner && !isSuperAdmin) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
        }

        // Gate: Quality Score >= 85 for featuring
        if (input.featured) {
          const qualityScore = listing.qualityScore || 0; // Assuming it's already calculated on save
          if (qualityScore < 85 && !isSuperAdmin) {
            // Admins can override
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: `Listing Quality Score must be at least 85 to be Featured. Current score: ${qualityScore}.`,
            });
          }
        }

        // Update listing
        // Since db.updateListing takes partial, we can use it.
        await db.updateListing(input.listingId, { featured: input.featured ? 1 : 0 });

        return { success: true };
      } catch (error) {
        console.error('Error promoting listing:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update promotion status',
        });
      }
    }),

  /**
   * Approve listing (Super Admin only)
   */
  approve: protectedProcedure
    .input(
      z.object({
        listingId: z.number(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'super_admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      try {
        const listing = await db.getListingById(input.listingId);
        if (!listing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
        }

        // Update listing status to approved
        await db.approveListing(input.listingId, requireUser(ctx).id, input.notes);

        if (listing?.userId) {
          await recordAgentOsEvent({
            userId: listing.userId,
            eventType: 'agent_listing_live',
            eventData: {
              listingId: input.listingId,
              source: 'admin_approval',
            },
            req: ctx.req,
            requestId: ctx.requestId,
          });
        }

        return { success: true };
      } catch (error) {
        console.error('Error approving listing:', error);
        throw mapListingLifecycleError(error, 'Failed to approve listing');
      }
    }),

  /**
   * Reject listing (Super Admin only)
   */
  reject: protectedProcedure
    .input(
      z.object({
        listingId: z.number(),
        reason: z.string().optional(), // Now optional as we use reasons array primarily
        reasons: z.array(z.string()).optional(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'super_admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      try {
        // Construct composite reason if legacy reason provided
        // Store structured data
        await db.rejectListing(
          input.listingId,
          requireUser(ctx).id,
          input.reason || 'See rejection reasons',
          input.reasons,
          input.note,
        );

        return { success: true };
      } catch (error) {
        console.error('Error rejecting listing:', error);
        throw mapListingLifecycleError(error, 'Failed to reject listing');
      }
    }),

  /**
   * Get approval queue (Super Admin only)
   */
  getApprovalQueue: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'reviewing', 'approved', 'rejected']).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== 'super_admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      try {
        const queueItems = await db.getApprovalQueue(input.status);

        return queueItems.slice(input.offset, input.offset + input.limit);
      } catch (error) {
        console.error('Error fetching approval queue:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch approval queue',
        });
      }
    }),
});

// Export type router type signature
export type ListingRouter = typeof listingRouter;
