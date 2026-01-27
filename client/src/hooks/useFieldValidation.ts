/**
 * useFieldValidation Hook
 *
 * Provides easy-to-use field validation for form components
 */

import { useState, useCallback, useEffect } from 'react';
import { getFieldError } from '@/lib/validation/listingValidationRules';
import type { ValidationContext } from '@/lib/validation/ValidationEngine';

interface UseFieldValidationOptions {
  /**
   * Field name to validate
   */
  field: string;

  /**
   * Current field value
   */
  value: any;

  /**
   * Validation context (action, propertyType, etc.)
   */
  context?: ValidationContext;

  /**
   * When to trigger validation
   */
  trigger?: 'blur' | 'change' | 'submit';

  /**
   * Debounce delay in ms (for 'change' trigger)
   */
  debounceMs?: number;
}

interface UseFieldValidationReturn {
  /**
   * Current error message (if any)
   */
  error: string | undefined;

  /**
   * Whether the field is currently valid
   */
  isValid: boolean;

  /**
   * Whether validation is in progress
   */
  isValidating: boolean;

  /**
   * Manually trigger validation
   */
  validate: () => Promise<boolean>;

  /**
   * Clear the current error
   */
  clearError: () => void;

  /**
   * Handler for onBlur event
   */
  onBlur: () => void;

  /**
   * Handler for onChange event
   */
  onChange: () => void;
}

/**
 * Hook for field-level validation
 */
export const useFieldValidation = ({
  field,
  value,
  context,
  trigger = 'blur',
  debounceMs = 300,
}: UseFieldValidationOptions): UseFieldValidationReturn => {
  const [error, setError] = useState<string | undefined>(undefined);
  const [isValidating, setIsValidating] = useState(false);
  const [touched, setTouched] = useState(false);

  /**
   * Perform validation
   */
  const validate = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);

    try {
      const errorMessage = await getFieldError(field, value, context);
      setError(errorMessage);
      return !errorMessage;
    } catch (err) {
      console.error('Validation error:', err);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [field, value, context]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  /**
   * Handle blur event
   */
  const onBlur = useCallback(() => {
    setTouched(true);
    if (trigger === 'blur') {
      validate();
    }
  }, [trigger, validate]);

  /**
   * Handle change event
   */
  const onChange = useCallback(() => {
    if (trigger === 'change' && touched) {
      // Debounce validation on change
      const timer = setTimeout(() => {
        validate();
      }, debounceMs);

      return () => clearTimeout(timer);
    }
  }, [trigger, touched, validate, debounceMs]);

  /**
   * Auto-validate on value change (if trigger is 'change' and field is touched)
   */
  useEffect(() => {
    if (trigger === 'change' && touched) {
      const timer = setTimeout(() => {
        validate();
      }, debounceMs);

      return () => clearTimeout(timer);
    }
  }, [value, trigger, touched, validate, debounceMs]);

  /**
   * Clear error when value becomes valid
   */
  useEffect(() => {
    if (error && value) {
      // Re-validate to clear error if value is now valid
      validate();
    }
  }, [value]);

  return {
    error,
    isValid: !error,
    isValidating,
    validate,
    clearError,
    onBlur,
    onChange,
  };
};

/**
 * Hook for form-level validation
 */
export const useFormValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Set error for a specific field
   */
  const setFieldError = useCallback((field: string, error: string | undefined) => {
    setErrors(prev => {
      if (!error) {
        const { [field]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [field]: error };
    });
  }, []);

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Check if form is valid
   */
  const isValid = Object.keys(errors).length === 0;

  return {
    errors,
    isValid,
    isValidating,
    setFieldError,
    clearFieldError,
    clearErrors,
    setIsValidating,
  };
};
