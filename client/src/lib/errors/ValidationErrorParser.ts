/**
 * Utility for parsing server validation errors and mapping them to form fields
 */

export interface FieldError {
  field: string;
  message: string;
  step?: number; // Which wizard step contains this field
}

export interface ValidationErrorResult {
  fieldErrors: FieldError[];
  generalErrors: string[];
  affectedSteps: number[];
}

/**
 * Maps field names to wizard steps
 */
const LISTING_FIELD_TO_STEP_MAP: Record<string, number> = {
  // Step 1: Action
  action: 1,

  // Step 2: Property Type
  propertyType: 2,

  // Step 3: Basic Information
  title: 3,
  description: 3,

  // Step 4: Additional Information
  bedrooms: 4,
  bathrooms: 4,
  parkingSpaces: 4,
  floorSize: 4,
  erfSize: 4,
  features: 4,

  // Step 5: Pricing
  askingPrice: 5,
  monthlyRent: 5,
  deposit: 5,
  transferCostEstimate: 5,
  startingBid: 5,
  reservePrice: 5,
  leaseTerms: 5,
  availableFrom: 5,
  utilitiesIncluded: 5,
  auctionDateTime: 5,
  negotiable: 5,

  // Step 6: Location
  address: 6,
  city: 6,
  suburb: 6,
  province: 6,
  postalCode: 6,
  latitude: 6,
  longitude: 6,

  // Step 7: Media
  media: 7,
  mediaIds: 7,
  mainMediaId: 7,
};

const DEVELOPMENT_FIELD_TO_STEP_MAP: Record<string, number> = {
  // Step 1: Basic Details (0-indexed in dev wizard)
  developmentName: 0,
  address: 0,
  city: 0,
  suburb: 0,
  province: 0,
  postalCode: 0,
  latitude: 0,
  longitude: 0,

  // Step 2: Unit Types
  unitTypes: 1,

  // Step 3: Highlights
  description: 2,
  amenities: 2,
  highlights: 2,
  completionDate: 2,

  // Step 4: Media
  media: 3,

  // Step 5: Developer Info
  developerName: 4,
  contactDetails: 4,
};

/**
 * Parse validation errors from various server response formats
 */
export function parseServerValidationErrors(
  error: any,
  wizardType: 'listing' | 'development' = 'listing',
): ValidationErrorResult {
  const fieldErrors: FieldError[] = [];
  const generalErrors: string[] = [];
  const affectedSteps = new Set<number>();

  const fieldMap =
    wizardType === 'listing' ? LISTING_FIELD_TO_STEP_MAP : DEVELOPMENT_FIELD_TO_STEP_MAP;

  // Handle different error response formats

  // Format 1: tRPC error with data.zodError
  if (error?.data?.zodError?.fieldErrors) {
    const zodErrors = error.data.zodError.fieldErrors;

    Object.entries(zodErrors).forEach(([field, messages]) => {
      const messageArray = Array.isArray(messages) ? messages : [messages];
      messageArray.forEach((message: any) => {
        const step = fieldMap[field];
        fieldErrors.push({
          field,
          message: typeof message === 'string' ? message : String(message),
          step,
        });
        if (step !== undefined) {
          affectedSteps.add(step);
        }
      });
    });
  }

  // Format 2: tRPC error with data.validationErrors
  else if (error?.data?.validationErrors) {
    const validationErrors = error.data.validationErrors;

    if (Array.isArray(validationErrors)) {
      validationErrors.forEach((err: any) => {
        if (err.field) {
          const step = fieldMap[err.field];
          fieldErrors.push({
            field: err.field,
            message: err.message || 'Validation error',
            step,
          });
          if (step !== undefined) {
            affectedSteps.add(step);
          }
        } else {
          generalErrors.push(err.message || 'Validation error');
        }
      });
    } else if (typeof validationErrors === 'object') {
      Object.entries(validationErrors).forEach(([field, message]) => {
        const step = fieldMap[field];
        fieldErrors.push({
          field,
          message: typeof message === 'string' ? message : String(message),
          step,
        });
        if (step !== undefined) {
          affectedSteps.add(step);
        }
      });
    }
  }

  // Format 3: Standard error with errors array
  else if (error?.errors && Array.isArray(error.errors)) {
    error.errors.forEach((err: any) => {
      if (err.path && err.path.length > 0) {
        const field = err.path[0];
        const step = fieldMap[field];
        fieldErrors.push({
          field,
          message: err.message || 'Validation error',
          step,
        });
        if (step !== undefined) {
          affectedSteps.add(step);
        }
      } else {
        generalErrors.push(err.message || 'Validation error');
      }
    });
  }

  // Format 4: Simple field errors object
  else if (error?.fieldErrors && typeof error.fieldErrors === 'object') {
    Object.entries(error.fieldErrors).forEach(([field, message]) => {
      const step = fieldMap[field];
      fieldErrors.push({
        field,
        message: typeof message === 'string' ? message : String(message),
        step,
      });
      if (step !== undefined) {
        affectedSteps.add(step);
      }
    });
  }

  // Format 5: Generic message
  else if (error?.message) {
    generalErrors.push(error.message);
  }

  return {
    fieldErrors,
    generalErrors,
    affectedSteps: Array.from(affectedSteps).sort((a, b) => a - b),
  };
}

/**
 * Get user-friendly field name for display
 */
export function getFieldDisplayName(field: string): string {
  const displayNames: Record<string, string> = {
    // Basic fields
    action: 'Action',
    propertyType: 'Property Type',
    title: 'Title',
    description: 'Description',

    // Property details
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    parkingSpaces: 'Parking Spaces',
    floorSize: 'Floor Size',
    erfSize: 'Erf Size',
    features: 'Features',

    // Pricing
    askingPrice: 'Asking Price',
    monthlyRent: 'Monthly Rent',
    deposit: 'Deposit',
    transferCostEstimate: 'Transfer Cost Estimate',
    startingBid: 'Starting Bid',
    reservePrice: 'Reserve Price',
    leaseTerms: 'Lease Terms',
    availableFrom: 'Available From',
    utilitiesIncluded: 'Utilities Included',
    auctionDateTime: 'Auction Date & Time',
    negotiable: 'Negotiable',

    // Location
    address: 'Address',
    city: 'City',
    suburb: 'Suburb',
    province: 'Province',
    postalCode: 'Postal Code',
    latitude: 'Latitude',
    longitude: 'Longitude',

    // Media
    media: 'Media',
    mediaIds: 'Media',
    mainMediaId: 'Primary Media',

    // Development fields
    developmentName: 'Development Name',
    unitTypes: 'Unit Types',
    amenities: 'Amenities',
    highlights: 'Highlights',
    completionDate: 'Completion Date',
    developerName: 'Developer Name',
    contactDetails: 'Contact Details',
  };

  return displayNames[field] || field.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationErrorResult): string[] {
  const messages: string[] = [];

  // Add field-specific errors
  result.fieldErrors.forEach(({ field, message }) => {
    const displayName = getFieldDisplayName(field);
    messages.push(`${displayName}: ${message}`);
  });

  // Add general errors
  messages.push(...result.generalErrors);

  return messages;
}

/**
 * Get summary message for validation errors
 */
export function getValidationErrorSummary(result: ValidationErrorResult): string {
  const fieldCount = result.fieldErrors.length;
  const generalCount = result.generalErrors.length;
  const totalCount = fieldCount + generalCount;

  if (totalCount === 0) {
    return 'Validation failed';
  }

  if (totalCount === 1) {
    return result.fieldErrors[0]?.message || result.generalErrors[0] || 'Validation failed';
  }

  const parts: string[] = [];
  if (fieldCount > 0) {
    parts.push(`${fieldCount} field${fieldCount > 1 ? 's' : ''}`);
  }
  if (generalCount > 0) {
    parts.push(`${generalCount} error${generalCount > 1 ? 's' : ''}`);
  }

  return `Please fix ${parts.join(' and ')}`;
}
