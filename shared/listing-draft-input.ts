// Shared input contract: private drafts use the same validation as listing.create.
import { z } from 'zod';
import { canonicalListingLocationSchema } from './canonicalListingLocation';
import { getListingAuthoringValidationMessage, LISTING_PROPERTY_TYPES } from './property-taxonomy';
import { listingActionToIntent } from './listing-types';
import { validateFeaturesContext } from './features-context';
import { validatePricingContract } from './pricing-contract';
import { validateRentalTerms } from './rental-terms-contract';

const listingActionSchema = z.enum(['sell', 'rent', 'auction']);
const propertyTypeSchema = z.enum(LISTING_PROPERTY_TYPES);

export const listingMediaInputSchema = z.object({
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

export const createListingSchemaBase = z.object({
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
    // Auction fields
    startingBid: z.number().optional(),
    reservePrice: z.number().optional(),
    auctionDateTime: z.date().optional(),
    auctionTermsDocumentUrl: z.string().optional(),
  }),
  propertyDetails: z.record(z.string(), z.any()),
  location: canonicalListingLocationSchema,
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

export const createListingSchema = createListingSchemaBase.superRefine((input, context) => {
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

  if (input.action === 'rent') {
    for (const issue of validateRentalTerms(input.propertyDetails.rentalTerms, { mode: 'draft' })) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['propertyDetails', ...issue.field.split('.')],
        message: issue.message,
      });
    }
  }
});
