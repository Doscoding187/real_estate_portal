/**
 * Content Validator
 *
 * Validates CMS content against requirements:
 * - Headline: 50-70 characters
 * - Subheadline: 100-150 characters
 * - Feature descriptions: 80-120 characters
 * - FAQ answers: 150-300 characters
 *
 * Requirements: 1.1, 3.3, 9.3
 */

import { AdvertisePageContent, HeroContent, FeatureBlock, FAQ } from './types';

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  currentLength?: number;
  expectedRange?: [number, number];
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validation rules
 */
const VALIDATION_RULES = {
  headline: { min: 50, max: 70 },
  subheadline: { min: 100, max: 150 },
  featureDescription: { min: 80, max: 120 },
  faqAnswer: { min: 150, max: 300 },
} as const;

/**
 * Validate string length against a range
 */
function validateLength(
  value: string,
  min: number,
  max: number,
  field: string,
): ValidationError | null {
  const length = value.length;

  if (length < min) {
    return {
      field,
      message: `${field} is too short (${length} characters). Should be ${min}-${max} characters.`,
      currentLength: length,
      expectedRange: [min, max],
    };
  }

  if (length > max) {
    return {
      field,
      message: `${field} is too long (${length} characters). Should be ${min}-${max} characters.`,
      currentLength: length,
      expectedRange: [min, max],
    };
  }

  return null;
}

/**
 * Validate string length with warning threshold
 * Returns error if outside range, warning if close to limits
 */
function validateLengthWithWarning(
  value: string,
  min: number,
  max: number,
  field: string,
  warningThreshold: number = 5,
): { error: ValidationError | null; warning: ValidationError | null } {
  const length = value.length;
  const error = validateLength(value, min, max, field);

  // Check for warnings (within threshold of limits)
  let warning: ValidationError | null = null;
  if (!error) {
    if (length <= min + warningThreshold) {
      warning = {
        field,
        message: `${field} is close to minimum length (${length}/${min} characters).`,
        currentLength: length,
        expectedRange: [min, max],
      };
    } else if (length >= max - warningThreshold) {
      warning = {
        field,
        message: `${field} is close to maximum length (${length}/${max} characters).`,
        currentLength: length,
        expectedRange: [min, max],
      };
    }
  }

  return { error, warning };
}

/**
 * Validate hero content
 */
export function validateHeroContent(hero: HeroContent): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate headline (50-70 characters)
  const headlineValidation = validateLengthWithWarning(
    hero.headline,
    VALIDATION_RULES.headline.min,
    VALIDATION_RULES.headline.max,
    'Hero headline',
  );
  if (headlineValidation.error) errors.push(headlineValidation.error);
  if (headlineValidation.warning) warnings.push(headlineValidation.warning);

  // Validate subheadline (100-150 characters)
  const subheadlineValidation = validateLengthWithWarning(
    hero.subheadline,
    VALIDATION_RULES.subheadline.min,
    VALIDATION_RULES.subheadline.max,
    'Hero subheadline',
  );
  if (subheadlineValidation.error) errors.push(subheadlineValidation.error);
  if (subheadlineValidation.warning) warnings.push(subheadlineValidation.warning);

  // Validate CTA labels (should not be empty)
  if (!hero.primaryCTA.label.trim()) {
    errors.push({
      field: 'Primary CTA label',
      message: 'Primary CTA label cannot be empty',
    });
  }

  if (!hero.secondaryCTA.label.trim()) {
    errors.push({
      field: 'Secondary CTA label',
      message: 'Secondary CTA label cannot be empty',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate feature blocks
 */
export function validateFeatureBlocks(features: FeatureBlock[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  features.forEach((feature, index) => {
    // Validate description (80-120 characters)
    const descValidation = validateLengthWithWarning(
      feature.description,
      VALIDATION_RULES.featureDescription.min,
      VALIDATION_RULES.featureDescription.max,
      `Feature "${feature.headline}" description`,
    );
    if (descValidation.error) errors.push(descValidation.error);
    if (descValidation.warning) warnings.push(descValidation.warning);

    // Validate headline is not empty
    if (!feature.headline.trim()) {
      errors.push({
        field: `Feature ${index + 1} headline`,
        message: 'Feature headline cannot be empty',
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate FAQ items
 */
export function validateFAQs(faqs: FAQ[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  faqs.forEach((faq, index) => {
    // Validate answer (150-300 characters)
    const answerValidation = validateLengthWithWarning(
      faq.answer,
      VALIDATION_RULES.faqAnswer.min,
      VALIDATION_RULES.faqAnswer.max,
      `FAQ "${faq.question}" answer`,
    );
    if (answerValidation.error) errors.push(answerValidation.error);
    if (answerValidation.warning) warnings.push(answerValidation.warning);

    // Validate question is not empty
    if (!faq.question.trim()) {
      errors.push({
        field: `FAQ ${index + 1} question`,
        message: 'FAQ question cannot be empty',
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate complete page content
 */
export function validatePageContent(content: AdvertisePageContent): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  // Validate hero
  const heroResult = validateHeroContent(content.hero);
  allErrors.push(...heroResult.errors);
  allWarnings.push(...heroResult.warnings);

  // Validate value proposition features
  const featuresResult = validateFeatureBlocks(content.valueProposition);
  allErrors.push(...featuresResult.errors);
  allWarnings.push(...featuresResult.warnings);

  // Validate FAQs
  const faqsResult = validateFAQs(content.faqs);
  allErrors.push(...faqsResult.errors);
  allWarnings.push(...faqsResult.warnings);

  // Validate final CTA
  const finalCTAResult = validateHeroContent({
    ...content.hero,
    headline: content.finalCTA.headline,
    subheadline: content.finalCTA.subtext,
  });
  allErrors.push(...finalCTAResult.errors);
  allWarnings.push(...finalCTAResult.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Get validation summary as a formatted string
 */
export function getValidationSummary(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.isValid) {
    lines.push('✓ Content validation passed');
  } else {
    lines.push('✗ Content validation failed');
  }

  if (result.errors.length > 0) {
    lines.push('\nErrors:');
    result.errors.forEach(error => {
      lines.push(`  - ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    result.warnings.forEach(warning => {
      lines.push(`  - ${warning.message}`);
    });
  }

  return lines.join('\n');
}

/**
 * Validate content and throw if invalid
 * Useful for enforcing validation before saving
 */
export function assertValidContent(content: AdvertisePageContent): void {
  const result = validatePageContent(content);

  if (!result.isValid) {
    const summary = getValidationSummary(result);
    throw new Error(`Content validation failed:\n${summary}`);
  }
}
