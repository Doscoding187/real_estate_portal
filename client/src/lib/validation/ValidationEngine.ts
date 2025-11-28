/**
 * Validation Engine - Rule-based validation system
 * 
 * Provides a flexible, reusable validation system for forms with:
 * - Rule-based validation
 * - Conditional validation based on context
 * - Support for sync and async validators
 * - Composable validation rules
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationContext {
  action?: string;
  propertyType?: string;
  currentStep?: number;
  [key: string]: any;
}

export type ValidatorFunction = (
  value: any,
  context?: ValidationContext
) => ValidationResult | Promise<ValidationResult>;

export interface ValidationRule {
  field: string;
  validator: ValidatorFunction;
  message: string;
  trigger?: 'blur' | 'change' | 'submit';
  condition?: (context?: ValidationContext) => boolean;
}

/**
 * ValidationEngine class
 * Manages validation rules and executes validation
 */
export class ValidationEngine {
  private rules: Map<string, ValidationRule[]> = new Map();

  /**
   * Add a validation rule
   */
  addRule(rule: ValidationRule): void {
    const existingRules = this.rules.get(rule.field) || [];
    this.rules.set(rule.field, [...existingRules, rule]);
  }

  /**
   * Add multiple validation rules
   */
  addRules(rules: ValidationRule[]): void {
    rules.forEach(rule => this.addRule(rule));
  }

  /**
   * Validate a single field
   */
  async validate(
    field: string,
    value: any,
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const fieldRules = this.rules.get(field);

    if (!fieldRules || fieldRules.length === 0) {
      return { isValid: true };
    }

    // Run all rules for this field
    for (const rule of fieldRules) {
      // Check if rule should be applied based on condition
      if (rule.condition && !rule.condition(context)) {
        continue;
      }

      const result = await rule.validator(value, context);

      if (!result.isValid) {
        return {
          isValid: false,
          error: result.error || rule.message,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate multiple fields
   */
  async validateFields(
    data: Record<string, any>,
    context?: ValidationContext
  ): Promise<Record<string, ValidationResult>> {
    const results: Record<string, ValidationResult> = {};

    for (const [field, value] of Object.entries(data)) {
      results[field] = await this.validate(field, value, context);
    }

    return results;
  }

  /**
   * Validate all fields for a specific step
   */
  async validateStep(
    step: number,
    data: Record<string, any>,
    context?: ValidationContext
  ): Promise<ValidationResult[]> {
    const stepContext = { ...context, currentStep: step };
    const results: ValidationResult[] = [];

    for (const [field, value] of Object.entries(data)) {
      const result = await this.validate(field, value, stepContext);
      if (!result.isValid) {
        results.push({ ...result, error: `${field}: ${result.error}` });
      }
    }

    return results;
  }

  /**
   * Check if all validations pass
   */
  async isValid(
    data: Record<string, any>,
    context?: ValidationContext
  ): Promise<boolean> {
    const results = await this.validateFields(data, context);
    return Object.values(results).every(result => result.isValid);
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * Remove rules for a specific field
   */
  removeFieldRules(field: string): void {
    this.rules.delete(field);
  }
}

// ============================================================================
// Common Validators
// ============================================================================

/**
 * Required field validator
 */
export const required = (message = 'This field is required'): ValidatorFunction => {
  return (value: any): ValidationResult => {
    const isEmpty =
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);

    return {
      isValid: !isEmpty,
      error: isEmpty ? message : undefined,
    };
  };
};

/**
 * Minimum length validator
 */
export const minLength = (min: number, message?: string): ValidatorFunction => {
  return (value: any): ValidationResult => {
    const length = value?.toString().length || 0;
    const isValid = length >= min;

    return {
      isValid,
      error: isValid ? undefined : message || `Must be at least ${min} characters`,
    };
  };
};

/**
 * Maximum length validator
 */
export const maxLength = (max: number, message?: string): ValidatorFunction => {
  return (value: any): ValidationResult => {
    const length = value?.toString().length || 0;
    const isValid = length <= max;

    return {
      isValid,
      error: isValid ? undefined : message || `Must be at most ${max} characters`,
    };
  };
};

/**
 * Email format validator
 */
export const email = (message = 'Invalid email format'): ValidatorFunction => {
  return (value: any): ValidationResult => {
    if (!value) return { isValid: true }; // Allow empty (use required separately)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(value);

    return {
      isValid,
      error: isValid ? undefined : message,
    };
  };
};

/**
 * Phone number validator (South African format)
 */
export const phone = (message = 'Invalid phone number'): ValidatorFunction => {
  return (value: any): ValidationResult => {
    if (!value) return { isValid: true }; // Allow empty (use required separately)

    // South African phone formats: +27 XX XXX XXXX, 0XX XXX XXXX, etc.
    const phoneRegex = /^(\+27|0)[0-9]{9}$/;
    const cleanedValue = value.replace(/[\s-]/g, ''); // Remove spaces and dashes
    const isValid = phoneRegex.test(cleanedValue);

    return {
      isValid,
      error: isValid ? undefined : message,
    };
  };
};

/**
 * Numeric validator
 */
export const numeric = (message = 'Must be a number'): ValidatorFunction => {
  return (value: any): ValidationResult => {
    if (value === null || value === undefined || value === '') {
      return { isValid: true }; // Allow empty (use required separately)
    }

    const isValid = !isNaN(Number(value));

    return {
      isValid,
      error: isValid ? undefined : message,
    };
  };
};

/**
 * Minimum value validator
 */
export const min = (minValue: number, message?: string): ValidatorFunction => {
  return (value: any): ValidationResult => {
    if (value === null || value === undefined || value === '') {
      return { isValid: true }; // Allow empty (use required separately)
    }

    const numValue = Number(value);
    const isValid = !isNaN(numValue) && numValue >= minValue;

    return {
      isValid,
      error: isValid ? undefined : message || `Must be at least ${minValue}`,
    };
  };
};

/**
 * Maximum value validator
 */
export const max = (maxValue: number, message?: string): ValidatorFunction => {
  return (value: any): ValidationResult => {
    if (value === null || value === undefined || value === '') {
      return { isValid: true }; // Allow empty (use required separately)
    }

    const numValue = Number(value);
    const isValid = !isNaN(numValue) && numValue <= maxValue;

    return {
      isValid,
      error: isValid ? undefined : message || `Must be at most ${maxValue}`,
    };
  };
};

/**
 * Range validator
 */
export const range = (
  minValue: number,
  maxValue: number,
  message?: string
): ValidatorFunction => {
  return (value: any): ValidationResult => {
    if (value === null || value === undefined || value === '') {
      return { isValid: true }; // Allow empty (use required separately)
    }

    const numValue = Number(value);
    const isValid = !isNaN(numValue) && numValue >= minValue && numValue <= maxValue;

    return {
      isValid,
      error: isValid ? undefined : message || `Must be between ${minValue} and ${maxValue}`,
    };
  };
};

/**
 * URL validator
 */
export const url = (message = 'Invalid URL format'): ValidatorFunction => {
  return (value: any): ValidationResult => {
    if (!value) return { isValid: true }; // Allow empty (use required separately)

    try {
      new URL(value);
      return { isValid: true };
    } catch {
      return { isValid: false, error: message };
    }
  };
};

/**
 * Pattern validator (regex)
 */
export const pattern = (regex: RegExp, message = 'Invalid format'): ValidatorFunction => {
  return (value: any): ValidationResult => {
    if (!value) return { isValid: true }; // Allow empty (use required separately)

    const isValid = regex.test(value);

    return {
      isValid,
      error: isValid ? undefined : message,
    };
  };
};

/**
 * Custom validator
 */
export const custom = (
  validatorFn: (value: any, context?: ValidationContext) => boolean,
  message = 'Validation failed'
): ValidatorFunction => {
  return (value: any, context?: ValidationContext): ValidationResult => {
    const isValid = validatorFn(value, context);

    return {
      isValid,
      error: isValid ? undefined : message,
    };
  };
};

/**
 * Compose multiple validators
 */
export const compose = (...validators: ValidatorFunction[]): ValidatorFunction => {
  return async (value: any, context?: ValidationContext): Promise<ValidationResult> => {
    for (const validator of validators) {
      const result = await validator(value, context);
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true };
  };
};

// ============================================================================
// Conditional Validators
// ============================================================================

/**
 * Validate only if condition is met
 */
export const when = (
  condition: (context?: ValidationContext) => boolean,
  validator: ValidatorFunction
): ValidatorFunction => {
  return async (value: any, context?: ValidationContext): Promise<ValidationResult> => {
    if (!condition(context)) {
      return { isValid: true };
    }
    return await validator(value, context);
  };
};

// ============================================================================
// Export default instance
// ============================================================================

export const validationEngine = new ValidationEngine();
