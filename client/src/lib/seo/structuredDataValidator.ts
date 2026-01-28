/**
 * Structured Data Validator
 *
 * Validates structured data against Schema.org specifications.
 * Requirements 23.5, 30.5: Validate structured data against Schema.org
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Place schema
 * Requirements 30.1, 30.2: Ensure Place schema has required fields
 */
export function validatePlaceSchema(schema: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!schema['@context']) {
    errors.push('Missing required field: @context');
  } else if (schema['@context'] !== 'https://schema.org') {
    errors.push('Invalid @context value. Must be "https://schema.org"');
  }

  if (!schema['@type']) {
    errors.push('Missing required field: @type');
  } else if (!['Place', 'City', 'AdministrativeArea'].includes(schema['@type'])) {
    warnings.push(`Unexpected @type value: ${schema['@type']}`);
  }

  if (!schema.name) {
    errors.push('Missing required field: name');
  }

  if (!schema.url) {
    errors.push('Missing required field: url');
  } else if (!isValidUrl(schema.url)) {
    errors.push('Invalid URL format');
  }

  // Check geo coordinates
  if (schema.geo) {
    if (!schema.geo['@type'] || schema.geo['@type'] !== 'GeoCoordinates') {
      errors.push('Invalid geo.@type. Must be "GeoCoordinates"');
    }
    if (typeof schema.geo.latitude !== 'number') {
      errors.push('geo.latitude must be a number');
    }
    if (typeof schema.geo.longitude !== 'number') {
      errors.push('geo.longitude must be a number');
    }
    // Validate South Africa bounds
    if (schema.geo.latitude < -35 || schema.geo.latitude > -22) {
      warnings.push('Latitude outside South Africa bounds');
    }
    if (schema.geo.longitude < 16 || schema.geo.longitude > 33) {
      warnings.push('Longitude outside South Africa bounds');
    }
  } else {
    warnings.push('Missing recommended field: geo (coordinates)');
  }

  // Check address
  if (schema.address) {
    if (!schema.address['@type'] || schema.address['@type'] !== 'PostalAddress') {
      errors.push('Invalid address.@type. Must be "PostalAddress"');
    }
    if (!schema.address.addressLocality && !schema.address.addressRegion) {
      warnings.push('Address should include addressLocality or addressRegion');
    }
  } else {
    warnings.push('Missing recommended field: address');
  }

  // Check description
  if (!schema.description) {
    warnings.push('Missing recommended field: description');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate BreadcrumbList schema
 * Requirements 30.4: Ensure breadcrumb schema is valid
 */
export function validateBreadcrumbSchema(schema: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!schema['@context']) {
    errors.push('Missing required field: @context');
  } else if (schema['@context'] !== 'https://schema.org') {
    errors.push('Invalid @context value. Must be "https://schema.org"');
  }

  if (!schema['@type']) {
    errors.push('Missing required field: @type');
  } else if (schema['@type'] !== 'BreadcrumbList') {
    errors.push('Invalid @type value. Must be "BreadcrumbList"');
  }

  if (!schema.itemListElement) {
    errors.push('Missing required field: itemListElement');
  } else if (!Array.isArray(schema.itemListElement)) {
    errors.push('itemListElement must be an array');
  } else {
    // Validate each breadcrumb item
    schema.itemListElement.forEach((item: any, index: number) => {
      if (!item['@type'] || item['@type'] !== 'ListItem') {
        errors.push(`Item ${index}: Invalid @type. Must be "ListItem"`);
      }
      if (typeof item.position !== 'number') {
        errors.push(`Item ${index}: position must be a number`);
      }
      if (!item.name) {
        errors.push(`Item ${index}: Missing required field: name`);
      }
      if (!item.item) {
        errors.push(`Item ${index}: Missing required field: item (URL)`);
      } else if (!isValidUrl(item.item)) {
        errors.push(`Item ${index}: Invalid URL format`);
      }
    });

    // Check position sequence
    const positions = schema.itemListElement.map((item: any) => item.position);
    const expectedPositions = Array.from({ length: positions.length }, (_, i) => i + 1);
    if (JSON.stringify(positions) !== JSON.stringify(expectedPositions)) {
      warnings.push('Breadcrumb positions should be sequential starting from 1');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate complete structured data for a location page
 * Requirements 30.1-30.5: Comprehensive validation
 */
export function validateLocationStructuredData(
  placeSchema: any,
  breadcrumbSchema: any,
): ValidationResult {
  const placeResult = validatePlaceSchema(placeSchema);
  const breadcrumbResult = validateBreadcrumbSchema(breadcrumbSchema);

  return {
    isValid: placeResult.isValid && breadcrumbResult.isValid,
    errors: [...placeResult.errors, ...breadcrumbResult.errors],
    warnings: [...placeResult.warnings, ...breadcrumbResult.warnings],
  };
}

/**
 * Helper function to validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Log validation results (for development/debugging)
 */
export function logValidationResults(result: ValidationResult, context: string): void {
  if (!result.isValid) {
    console.error(`[Structured Data Validation] ${context} - FAILED`);
    result.errors.forEach(error => console.error(`  ❌ ${error}`));
  }

  if (result.warnings.length > 0) {
    console.warn(`[Structured Data Validation] ${context} - Warnings:`);
    result.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log(`[Structured Data Validation] ${context} - ✅ PASSED`);
  }
}
