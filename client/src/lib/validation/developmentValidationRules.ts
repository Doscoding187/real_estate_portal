/**
 * Development Wizard Validation Rules
 *
 * Defines all validation rules for the development wizard steps
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
  compose,
  type ValidationContext,
} from './ValidationEngine';

/**
 * Create validation engine for Development Wizard
 */
export const createDevelopmentValidationEngine = (): ValidationEngine => {
  const engine = new ValidationEngine();

  // ============================================================================
  // Step 1: Basic Details
  // ============================================================================

  // Development name validation
  engine.addRule({
    field: 'developmentName',
    validator: compose(
      required('Development name is required'),
      minLength(5, 'Development name must be at least 5 characters'),
      maxLength(255, 'Development name must not exceed 255 characters'),
    ),
    message: 'Invalid development name',
    trigger: 'blur',
  });

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

  // Status validation
  engine.addRule({
    field: 'status',
    validator: required('Development status is required'),
    message: 'Status is required',
    trigger: 'submit',
  });

  // ============================================================================
  // Step 2: Unit Types
  // ============================================================================

  // Unit types validation (at least one required)
  engine.addRule({
    field: 'unitTypes',
    validator: (value: any) => {
      const unitTypesArray = Array.isArray(value) ? value : [];
      const hasUnits = unitTypesArray.length > 0;
      return {
        isValid: hasUnits,
        error: hasUnits ? undefined : 'At least one unit type is required',
      };
    },
    message: 'Unit types are required',
    trigger: 'submit',
  });

  // Individual unit type validation
  engine.addRule({
    field: 'unitType.bedrooms',
    validator: compose(
      required('Number of bedrooms is required'),
      numeric('Bedrooms must be a number'),
      min(0, 'Bedrooms cannot be negative'),
    ),
    message: 'Invalid bedrooms',
    trigger: 'blur',
  });

  engine.addRule({
    field: 'unitType.priceFrom',
    validator: compose(
      required('Price is required'),
      numeric('Price must be a number'),
      min(1, 'Price must be greater than 0'),
    ),
    message: 'Invalid price',
    trigger: 'blur',
  });

  engine.addRule({
    field: 'unitType.availableUnits',
    validator: compose(
      required('Available units is required'),
      numeric('Available units must be a number'),
      min(0, 'Available units cannot be negative'),
    ),
    message: 'Invalid available units',
    trigger: 'blur',
  });

  // ============================================================================
  // Step 3: Highlights
  // ============================================================================

  // Description validation
  engine.addRule({
    field: 'description',
    validator: compose(
      required('Development description is required'),
      minLength(50, 'Description must be at least 50 characters'),
      maxLength(5000, 'Description must not exceed 5000 characters'),
    ),
    message: 'Invalid description',
    trigger: 'blur',
  });

  // Total units validation
  engine.addRule({
    field: 'totalUnits',
    validator: compose(
      required('Total units is required'),
      numeric('Total units must be a number'),
      min(1, 'Total units must be at least 1'),
    ),
    message: 'Invalid total units',
    trigger: 'blur',
  });

  // ============================================================================
  // Step 4: Media
  // ============================================================================

  // Media validation (at least one image required)
  engine.addRule({
    field: 'media',
    validator: (value: any) => {
      const mediaArray = Array.isArray(value) ? value : [];
      const hasMedia = mediaArray.length > 0;
      return {
        isValid: hasMedia,
        error: hasMedia ? undefined : 'At least one image is required',
      };
    },
    message: 'Media is required',
    trigger: 'submit',
  });

  // ============================================================================
  // Step 5: Developer Info
  // ============================================================================

  // Developer name validation
  engine.addRule({
    field: 'developerName',
    validator: compose(
      required('Developer name is required'),
      minLength(2, 'Developer name must be at least 2 characters'),
    ),
    message: 'Invalid developer name',
    trigger: 'blur',
  });

  // Contact name validation
  engine.addRule({
    field: 'contactDetails.name',
    validator: compose(
      required('Contact name is required'),
      minLength(2, 'Contact name must be at least 2 characters'),
    ),
    message: 'Invalid contact name',
    trigger: 'blur',
  });

  // Contact email validation
  engine.addRule({
    field: 'contactDetails.email',
    validator: compose(required('Contact email is required'), email('Invalid email format')),
    message: 'Invalid contact email',
    trigger: 'blur',
  });

  // Contact phone validation
  engine.addRule({
    field: 'contactDetails.phone',
    validator: compose(required('Contact phone is required'), phone('Invalid phone number format')),
    message: 'Invalid contact phone',
    trigger: 'blur',
  });

  return engine;
};

/**
 * Validate a specific step
 */
export const validateDevelopmentStep = async (
  step: number,
  data: any,
  context?: ValidationContext,
): Promise<{ isValid: boolean; errors: Record<string, string> }> => {
  const engine = createDevelopmentValidationEngine();
  const errors: Record<string, string> = {};

  // Define which fields to validate for each step
  const stepFields: Record<number, string[]> = {
    0: ['developmentName', 'address', 'city', 'province', 'status'],
    1: ['unitTypes'],
    2: ['description', 'totalUnits'],
    3: ['media'],
    4: ['developerName', 'contactDetails.name', 'contactDetails.email', 'contactDetails.phone'],
    5: [], // Preview - no validation needed
  };

  const fieldsToValidate = stepFields[step] || [];

  for (const field of fieldsToValidate) {
    // Handle nested fields (e.g., contactDetails.email)
    const value = field.includes('.')
      ? field.split('.').reduce((obj, key) => obj?.[key], data)
      : data[field];

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
export const getDevelopmentFieldError = async (
  field: string,
  value: any,
  context?: ValidationContext,
): Promise<string | undefined> => {
  const engine = createDevelopmentValidationEngine();
  const result = await engine.validate(field, value, context);
  return result.error;
};
