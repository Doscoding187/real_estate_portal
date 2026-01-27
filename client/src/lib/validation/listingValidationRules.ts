/**
 * Listing Wizard Validation Rules
 *
 * Defines all validation rules for the listing wizard steps
 */

import {
  ValidationEngine,
  required,
  minLength,
  maxLength,
  email,
  phone,
  numeric,
  min,
  max,
  url,
  compose,
  when,
  type ValidationContext,
} from './ValidationEngine';

/**
 * Create validation engine for Listing Wizard
 */
export const createListingValidationEngine = (): ValidationEngine => {
  const engine = new ValidationEngine();

  // ============================================================================
  // Step 1: Action Type
  // ============================================================================
  engine.addRule({
    field: 'action',
    validator: required('Please select an action (Sell, Rent, or Auction)'),
    message: 'Action is required',
    trigger: 'submit',
  });

  // ============================================================================
  // Step 2: Property Type
  // ============================================================================
  engine.addRule({
    field: 'propertyType',
    validator: required('Please select a property type'),
    message: 'Property type is required',
    trigger: 'submit',
  });

  // ============================================================================
  // Step 3: Basic Information
  // ============================================================================

  // Title validation
  engine.addRule({
    field: 'title',
    validator: compose(
      required('Property title is required'),
      minLength(10, 'Title must be at least 10 characters'),
      maxLength(255, 'Title must not exceed 255 characters'),
    ),
    message: 'Invalid title',
    trigger: 'blur',
  });

  // Description validation
  engine.addRule({
    field: 'description',
    validator: compose(
      required('Property description is required'),
      minLength(50, 'Description must be at least 50 characters'),
      maxLength(5000, 'Description must not exceed 5000 characters'),
    ),
    message: 'Invalid description',
    trigger: 'blur',
  });

  // ============================================================================
  // Step 5: Pricing
  // ============================================================================

  // Asking Price (for sell)
  engine.addRule({
    field: 'askingPrice',
    validator: compose(
      required('Asking price is required'),
      numeric('Price must be a number'),
      min(1, 'Price must be greater than 0'),
    ),
    message: 'Invalid asking price',
    trigger: 'blur',
    condition: (context?: ValidationContext) => context?.action === 'sell',
  });

  // Monthly Rent (for rent)
  engine.addRule({
    field: 'monthlyRent',
    validator: compose(
      required('Monthly rent is required'),
      numeric('Rent must be a number'),
      min(1, 'Rent must be greater than 0'),
    ),
    message: 'Invalid monthly rent',
    trigger: 'blur',
    condition: (context?: ValidationContext) => context?.action === 'rent',
  });

  // Deposit (for rent)
  engine.addRule({
    field: 'deposit',
    validator: compose(numeric('Deposit must be a number'), min(0, 'Deposit cannot be negative')),
    message: 'Invalid deposit',
    trigger: 'blur',
    condition: (context?: ValidationContext) => context?.action === 'rent',
  });

  // Starting Bid (for auction)
  engine.addRule({
    field: 'startingBid',
    validator: compose(
      required('Starting bid is required'),
      numeric('Starting bid must be a number'),
      min(1, 'Starting bid must be greater than 0'),
    ),
    message: 'Invalid starting bid',
    trigger: 'blur',
    condition: (context?: ValidationContext) => context?.action === 'auction',
  });

  // Reserve Price (for auction)
  engine.addRule({
    field: 'reservePrice',
    validator: compose(
      numeric('Reserve price must be a number'),
      min(0, 'Reserve price cannot be negative'),
    ),
    message: 'Invalid reserve price',
    trigger: 'blur',
    condition: (context?: ValidationContext) => context?.action === 'auction',
  });

  // ============================================================================
  // Step 6: Location
  // ============================================================================

  // Address validation
  engine.addRule({
    field: 'address',
    validator: compose(
      required('Address is required'),
      minLength(5, 'Address must be at least 5 characters'),
    ),
    message: 'Invalid address',
    trigger: 'blur',
  });

  // City validation
  engine.addRule({
    field: 'city',
    validator: required('City is required'),
    message: 'City is required',
    trigger: 'blur',
  });

  // Province validation
  engine.addRule({
    field: 'province',
    validator: required('Province is required'),
    message: 'Province is required',
    trigger: 'blur',
  });

  // Latitude validation
  engine.addRule({
    field: 'latitude',
    validator: compose(
      required('Location coordinates are required'),
      numeric('Latitude must be a number'),
    ),
    message: 'Invalid latitude',
    trigger: 'submit',
  });

  // Longitude validation
  engine.addRule({
    field: 'longitude',
    validator: compose(
      required('Location coordinates are required'),
      numeric('Longitude must be a number'),
    ),
    message: 'Invalid longitude',
    trigger: 'submit',
  });

  // ============================================================================
  // Step 7: Media
  // ============================================================================

  // Media validation (at least one image required)
  engine.addRule({
    field: 'media',
    validator: (value: any) => {
      const mediaArray = Array.isArray(value) ? value : [];
      const hasMedia = mediaArray.length > 0;
      return {
        isValid: hasMedia,
        error: hasMedia ? undefined : 'At least one image or video is required',
      };
    },
    message: 'Media is required',
    trigger: 'submit',
  });

  // Main media validation
  engine.addRule({
    field: 'mainMediaId',
    validator: (value: any, context?: ValidationContext) => {
      const mediaArray = Array.isArray(context?.media) ? context.media : [];
      const hasMainMedia = value !== null && value !== undefined;
      const hasMedia = mediaArray.length > 0;

      return {
        isValid: !hasMedia || hasMainMedia,
        error: hasMedia && !hasMainMedia ? 'Please select a primary image' : undefined,
      };
    },
    message: 'Primary media is required',
    trigger: 'submit',
  });

  // ============================================================================
  // Property Details (conditional based on property type)
  // ============================================================================

  // Bedrooms (for residential properties)
  engine.addRule({
    field: 'bedrooms',
    validator: compose(
      required('Number of bedrooms is required'),
      numeric('Bedrooms must be a number'),
      min(0, 'Bedrooms cannot be negative'),
      max(50, 'Bedrooms seems too high'),
    ),
    message: 'Invalid bedrooms',
    trigger: 'blur',
    condition: (context?: ValidationContext) =>
      ['apartment', 'house'].includes(context?.propertyType || ''),
  });

  // Bathrooms (for residential properties)
  engine.addRule({
    field: 'bathrooms',
    validator: compose(
      required('Number of bathrooms is required'),
      numeric('Bathrooms must be a number'),
      min(0, 'Bathrooms cannot be negative'),
      max(20, 'Bathrooms seems too high'),
    ),
    message: 'Invalid bathrooms',
    trigger: 'blur',
    condition: (context?: ValidationContext) =>
      ['apartment', 'house'].includes(context?.propertyType || ''),
  });

  // Area/Size validation (various fields based on property type)
  engine.addRule({
    field: 'unitSizeM2',
    validator: compose(
      required('Unit size is required'),
      numeric('Size must be a number'),
      min(1, 'Size must be greater than 0'),
    ),
    message: 'Invalid unit size',
    trigger: 'blur',
    condition: (context?: ValidationContext) => context?.propertyType === 'apartment',
  });

  engine.addRule({
    field: 'houseAreaM2',
    validator: compose(
      required('House size is required'),
      numeric('Size must be a number'),
      min(1, 'Size must be greater than 0'),
    ),
    message: 'Invalid house size',
    trigger: 'blur',
    condition: (context?: ValidationContext) => context?.propertyType === 'house',
  });

  engine.addRule({
    field: 'erfSizeM2',
    validator: compose(
      required('Yard size is required'),
      numeric('Size must be a number'),
      min(1, 'Size must be greater than 0'),
    ),
    message: 'Invalid yard size',
    trigger: 'blur',
    condition: (context?: ValidationContext) => context?.propertyType === 'house',
  });

  return engine;
};

/**
 * Validate a specific step
 */
export const validateListingStep = async (
  step: number,
  data: any,
  context?: ValidationContext,
): Promise<{ isValid: boolean; errors: Record<string, string> }> => {
  const engine = createListingValidationEngine();
  const errors: Record<string, string> = {};

  // Define which fields to validate for each step
  const stepFields: Record<number, string[]> = {
    1: ['action'],
    2: ['propertyType'],
    3: ['title', 'description'],
    4: [], // Additional info - mostly optional
    5: ['askingPrice', 'monthlyRent', 'deposit', 'startingBid', 'reservePrice'], // Conditional
    6: ['address', 'city', 'province', 'latitude', 'longitude'],
    7: ['media', 'mainMediaId'],
    8: [], // Preview - no validation needed
  };

  const fieldsToValidate = stepFields[step] || [];

  for (const field of fieldsToValidate) {
    const value = data[field];
    const result = await engine.validate(field, value, { ...context, currentStep: step });

    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Get validation error for a specific field
 */
export const getFieldError = async (
  field: string,
  value: any,
  context?: ValidationContext,
): Promise<string | undefined> => {
  const engine = createListingValidationEngine();
  const result = await engine.validate(field, value, context);
  return result.error;
};
