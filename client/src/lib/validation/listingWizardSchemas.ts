/**
 * Listing Wizard Zod Validation Schemas
 *
 * Zod schemas for each step of the listing wizard.
 * These are used by the StepValidator utility and integrated
 * into the workflow step definitions for per-step validation.
 *
 * Every schema exports:
 *   - A Zod object for the step
 *   - A `validate()` function that returns { valid, errors }
 *   - Cross-step validation helpers
 */

import { z } from 'zod';

// ─── Shared Primitives ───────────────────────────────────────────────

const nonEmptyString = (field: string) =>
  z.string().min(1, `${field} is required`);

const positiveNumber = (field: string) =>
  z.number().positive(`${field} must be a positive number`);

const zafCurrency = (field: string) =>
  z.number().min(1000, `${field} must be at least R 1,000`).max(100_000_000_000, `${field} is too high`);

// ─── Step 1: Action ─────────────────────────────────────────────────

export const actionSchema = z.object({
  action: z.enum(['sell', 'rent', 'auction'], {
    required_error: 'Please select an action (Sell, Rent, or Auction)',
  }),
});

export type ActionData = z.infer<typeof actionSchema>;

// ─── Step 2: Property Type ───────────────────────────────────────────

export const propertyTypeSchema = z.object({
  propertyType: z.enum(
    ['apartment', 'house', 'farm', 'land', 'commercial', 'shared_living'],
    { required_error: 'Please select a property type' },
  ),
});

export type PropertyTypeData = z.infer<typeof propertyTypeSchema>;

// ─── Step 3: Basic Information ───────────────────────────────────────

export const basicInformationSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(255, 'Title must not exceed 255 characters'),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must not exceed 5,000 characters'),
});

export type BasicInformationData = z.infer<typeof basicInformationSchema>;

// ─── Step 4: Additional Information (optional fields) ────────────────

export const additionalInformationSchema = z.object({
  // Residential
  furnishingStatus: z.enum(['unfurnished', 'semi_furnished', 'fully_furnished']).optional(),
  flooring: z.enum(['tile', 'carpet', 'wood', 'laminate', 'concrete', 'other']).optional(),
  petPolicy: z.enum(['allowed', 'cats_only', 'no_pets', 'by_arrangement']).optional(),
  securityFeatures: z.array(z.string()).optional(),

  // Commercial
  loadingDocks: z.number().int().min(0).optional(),
  parkingRatio: z.number().min(0).optional(),

  // Farm
  arableLandHa: z.number().positive().optional(),
  grazingLandHa: z.number().positive().optional(),
  irrigationType: z.string().optional(),

  // Shared Living
  houseRules: z.array(z.string()).optional(),
  billsIncluded: z.array(z.string()).optional(),
  minimumStayMonths: z.number().int().min(1).optional(),
});

export type AdditionalInformationData = z.infer<typeof additionalInformationSchema>;

// ─── Step 5: Pricing (action-dependent) ──────────────────────────────

export const sellPricingSchema = z.object({
  askingPrice: zafCurrency('Asking price'),
  negotiable: z.boolean().optional(),
  transferCostEstimate: z.number().min(0).optional(),
});

export const rentPricingSchema = z.object({
  monthlyRent: zafCurrency('Monthly rent'),
  deposit: z.number().min(0, 'Deposit cannot be negative'),
  leaseTerms: z.string().optional(),
  availableFrom: z.string().optional(),
  utilitiesIncluded: z.boolean().optional(),
});

export const auctionPricingSchema = z.object({
  startingBid: zafCurrency('Starting bid'),
  reservePrice: z.number().min(0, 'Reserve price cannot be negative').optional(),
  auctionDateTime: z.string().min(1, 'Auction date and time is required'),
  auctionTermsDocumentUrl: z.string().url().optional().or(z.literal('')),
});

// Dynamic pricing schema that selects based on action
export const pricingSchema = z.object({
  pricing: z.any().refine((val) => val !== undefined && val !== null, {
    message: 'Pricing information is required',
  }),
});

export type SellPricingData = z.infer<typeof sellPricingSchema>;
export type RentPricingData = z.infer<typeof rentPricingSchema>;
export type AuctionPricingData = z.infer<typeof auctionPricingSchema>;

// ─── Step 6: Location ────────────────────────────────────────────────

export const locationSchema = z.object({
  address: z.string().min(5, 'Address must be at least 5 characters'),
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  city: nonEmptyString('City'),
  province: nonEmptyString('Province'),
  suburb: z.string().optional(),
  postalCode: z.string().optional(),
  placeId: z.string().optional(),
});

export type LocationData = z.infer<typeof locationSchema>;

// ─── Step 7: Media Upload ────────────────────────────────────────────

export const mediaSchema = z.object({
  media: z.array(z.any()).min(1, 'Please upload at least one photo'),
  mainMediaId: z.string().optional(),
});

export type MediaData = z.infer<typeof mediaSchema>;

// ─── Cross-Step Validation ───────────────────────────────────────────

export interface CrossStepValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validate that pricing is consistent with the selected action.
 */
export function validatePricingConsistency(
  action: string | undefined,
  pricing: any,
): CrossStepValidationResult {
  const result: CrossStepValidationResult = {
    valid: true,
    warnings: [],
    errors: [],
  };

  if (!action || !pricing) return result;

  if (action === 'sell') {
    if (!pricing.askingPrice) {
      result.errors.push('Asking price is required for sale listings');
      result.valid = false;
    }
    if (pricing.askingPrice && pricing.askingPrice > 100_000_000) {
      result.warnings.push('This asking price is unusually high. Please verify it is correct.');
    }
  }

  if (action === 'rent') {
    if (!pricing.monthlyRent) {
      result.errors.push('Monthly rent is required for rental listings');
      result.valid = false;
    }
    if (pricing.monthlyRent && pricing.monthlyRent > 1_000_000) {
      result.warnings.push('This monthly rent is unusually high. Please verify.');
    }
  }

  if (action === 'auction') {
    if (!pricing.startingBid) {
      result.errors.push('Starting bid is required for auction listings');
      result.valid = false;
    }
    if (pricing.reservePrice && pricing.reservePrice < pricing.startingBid) {
      result.warnings.push('Reserve price is lower than the starting bid.');
    }
  }

  return result;
}

/**
 * Validate that location data is sufficient.
 */
export function validateLocationCompleteness(location: any): CrossStepValidationResult {
  const result: CrossStepValidationResult = {
    valid: true,
    warnings: [],
    errors: [],
  };

  if (!location) {
    result.errors.push('Location information is required');
    result.valid = false;
    return result;
  }

  if (!location.address) {
    result.errors.push('Street address is required');
    result.valid = false;
  }

  if (!location.latitude || !location.longitude) {
    result.errors.push('Please pin the property location on the map');
    result.valid = false;
  }

  if (!location.suburb) {
    result.warnings.push('Adding a suburb helps buyers find your property');
  }

  return result;
}

/**
 * Validate that media meets minimum requirements.
 */
export function validateMediaCompleteness(media: any[]): CrossStepValidationResult {
  const result: CrossStepValidationResult = {
    valid: true,
    warnings: [],
    errors: [],
  };

  if (!media || media.length === 0) {
    result.errors.push('At least one photo is required');
    result.valid = false;
    return result;
  }

  if (media.length < 3) {
    result.warnings.push('Listings with at least 3 photos get 40% more views');
  }

  if (media.length > 30) {
    result.warnings.push('Consider selecting your best 30 photos for optimal loading');
  }

  return result;
}

// ─── Step Validation Function ────────────────────────────────────────

export type StepValidationResult = {
  valid: boolean;
  errors: { field: string; message: string }[];
};

export function validateStepByAction(
  stepId: string,
  data: Record<string, any>,
  action?: string,
): StepValidationResult {
  switch (stepId) {
    case 'action': {
      const r = actionSchema.safeParse(data);
      return r.success
        ? { valid: true, errors: [] }
        : {
            valid: false,
            errors: r.error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          };
    }

    case 'property_type': {
      const r = propertyTypeSchema.safeParse(data);
      return r.success
        ? { valid: true, errors: [] }
        : {
            valid: false,
            errors: r.error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          };
    }

    case 'basic_information': {
      const r = basicInformationSchema.safeParse(data);
      return r.success
        ? { valid: true, errors: [] }
        : {
            valid: false,
            errors: r.error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          };
    }

    case 'additional_information': {
      const r = additionalInformationSchema.safeParse(data);
      return {
        valid: true, // All fields optional
        errors: r.success ? [] : [],
      };
    }

    case 'pricing': {
      const errors: { field: string; message: string }[] = [];
      const pricing = data.pricing as any;

      if (!pricing) {
        errors.push({ field: 'pricing', message: 'Pricing information is required' });
        return { valid: false, errors };
      }

      if (action === 'sell') {
        const r = sellPricingSchema.safeParse(pricing);
        if (!r.success) {
          errors.push(
            ...r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
          );
        }
      } else if (action === 'rent') {
        const r = rentPricingSchema.safeParse(pricing);
        if (!r.success) {
          errors.push(
            ...r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
          );
        }
      } else if (action === 'auction') {
        const r = auctionPricingSchema.safeParse(pricing);
        if (!r.success) {
          errors.push(
            ...r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
          );
        }
      }

      return { valid: errors.length === 0, errors };
    }

    case 'location': {
      const r = locationSchema.safeParse(data);
      return r.success
        ? { valid: true, errors: [] }
        : {
            valid: false,
            errors: r.error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          };
    }

    case 'media_upload': {
      const r = mediaSchema.safeParse(data);
      return r.success
        ? { valid: true, errors: [] }
        : {
            valid: false,
            errors: r.error.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          };
    }

    case 'preview_publish':
      return { valid: true, errors: [] };

    default:
      return { valid: true, errors: [] };
  }
}