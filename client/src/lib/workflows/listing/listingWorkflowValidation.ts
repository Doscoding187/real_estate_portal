import { createListingValidationEngine } from '@/lib/validation/listingValidationRules';
import type { ListingStepId, ListingFieldError, ListingWorkflowData } from '@shared/listing-workflow-types';
import type { ValidationContext } from '@/lib/validation/ValidationEngine';

/**
 * Map V2 step IDs to V1 numeric step numbers used by the existing
 * listingValidationRules.ts validateListingStep() function.
 *
 * V1 steps:
 *   1 = ActionStep
 *   2 = PropertyTypeStep
 *   3 = BasicInformationStep
 *   4 = AdditionalInformationStep
 *   5 = PricingStep
 *   6 = LocationStep
 *   7 = MediaUploadStep
 *   8 = PreviewStep
 */
const STEP_ID_TO_NUMBER: Record<ListingStepId, number> = {
  action: 1,
  property_type: 2,
  basic_information: 3,
  additional_information: 4,
  pricing: 5,
  location: 6,
  media_upload: 7,
  preview_publish: 8,
};

/**
 * Translate a V2 workflow step ID to the V1 numeric step number.
 */
export function v2StepToV1Number(stepId: ListingStepId): number {
  return STEP_ID_TO_NUMBER[stepId];
}

/**
 * Build a ValidationContext from workflow data, matching the shape
 * that listingValidationRules.ts conditions expect.
 */
export function buildValidationContext(data: ListingWorkflowData): ValidationContext {
  return {
    action: data.action,
    propertyType: data.propertyType,
    media: data.media,
    pricing: data.pricing,
  };
}

/**
 * Flatten wizard state into the flat key-value map that
 * listingValidationRules.ts validateListingStep() expects.
 *
 * The V1 `validateListingStep(step, data)` function accesses
 * `data[fieldName]` for each field in `stepFields[step]`.
 */
export function flattenWizardStateForValidation(
  data: ListingWorkflowData,
): Record<string, any> {
  const pricing = (data.pricing ?? {}) as Record<string, any>;
  return {
    action: data.action,
    propertyType: data.propertyType,
    title: data.title,
    description: data.description,
    askingPrice: pricing.askingPrice,
    monthlyRent: pricing.monthlyRent,
    deposit: pricing.deposit,
    startingBid: pricing.startingBid,
    reservePrice: pricing.reservePrice,
    address: (data.location as any)?.address,
    city: (data.location as any)?.city,
    province: (data.location as any)?.province,
    latitude: (data.location as any)?.latitude,
    longitude: (data.location as any)?.longitude,
    media: data.media,
    mainMediaId: (data as any).mainMediaId,
    bedrooms: (data.propertyDetails as any)?.bedrooms,
    bathrooms: (data.propertyDetails as any)?.bathrooms,
    unitSizeM2: (data.propertyDetails as any)?.unitSizeM2,
    houseAreaM2: (data.propertyDetails as any)?.houseAreaM2,
    erfSizeM2: (data.propertyDetails as any)?.erfSizeM2,
  };
}

/**
 * Validate a single V2 workflow step using the existing V1 validation engine.
 *
 * Uses createListingValidationEngine() — does NOT duplicate rules.
 *
 * Returns V2-style ListingFieldError[] for compatibility with the
 * existing ListingWizardContext error state.
 */
export async function validateListingWorkflowStep(
  stepId: ListingStepId,
  data: ListingWorkflowData,
): Promise<{ valid: boolean; errors: ListingFieldError[] }> {
  const v1StepNumber = v2StepToV1Number(stepId);
  const engine = createListingValidationEngine();
  const flatData = flattenWizardStateForValidation(data);
  const context = buildValidationContext(data);

  const stepFields: Record<number, string[]> = {
    1: ['action'],
    2: ['propertyType'],
    3: ['title', 'description'],
    4: [],
    5: ['askingPrice', 'monthlyRent', 'deposit', 'startingBid', 'reservePrice'],
    6: ['address', 'city', 'province', 'latitude', 'longitude'],
    7: ['media', 'mainMediaId'],
    8: [],
  };

  const fieldsToValidate = stepFields[v1StepNumber] ?? [];
  const errors: ListingFieldError[] = [];

  for (const field of fieldsToValidate) {
    const value = flatData[field];
    const result = await engine.validate(field, value, {
      ...context,
      currentStep: v1StepNumber,
    });

    if (!result.isValid && result.error) {
      errors.push({ field, message: result.error, step: stepId });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an entire listing payload using the V1 validation engine.
 *
 * Runs all step-level validations and collects every error.
 * Useful for pre-submit checks.
 */
export async function validateListingWorkflowPayload(
  data: ListingWorkflowData,
): Promise<{ valid: boolean; errors: ListingFieldError[] }> {
  const stepIds: ListingStepId[] = [
    'action',
    'property_type',
    'basic_information',
    'additional_information',
    'pricing',
    'location',
    'media_upload',
    'preview_publish',
  ];

  const allErrors: ListingFieldError[] = [];

  for (const stepId of stepIds) {
    const result = await validateListingWorkflowStep(stepId, data);
    if (!result.valid) {
      allErrors.push(...result.errors);
    }
  }

  return { valid: allErrors.length === 0, errors: allErrors };
}
