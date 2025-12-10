/**
 * Property-Based Tests for Soft-UI Design Tokens
 * 
 * Feature: advertise-with-us-landing, Property 1: Design token structure
 * Validates: Requirements 11.1
 * 
 * These tests verify that design tokens maintain consistent structure and valid values
 * across all token categories.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { softUITokens } from '../design-tokens';

describe('Design Token Consistency - Property Tests', () => {
  /**
   * Property 1: Design token structure
   * For any design token category, all tokens should have valid, non-empty values
   */
  it('should have valid color values for all color tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.keys(softUITokens.colors)
        ),
        (colorCategory) => {
          const category = softUITokens.colors[colorCategory as keyof typeof softUITokens.colors];
          
          // All color values should be non-empty strings
          const allValues = Object.values(category);
          expect(allValues.length).toBeGreaterThan(0);
          
          allValues.forEach((value) => {
            expect(typeof value).toBe('string');
            expect(value.length).toBeGreaterThan(0);
            
            // Should be valid CSS color (hex, rgb, rgba, or gradient)
            const isValidColor = 
              /^#[0-9A-Fa-f]{6}$/.test(value) || // hex
              /^#[0-9A-Fa-f]{3}$/.test(value) || // short hex
              /^rgb/.test(value) || // rgb/rgba
              /^linear-gradient/.test(value); // gradient
            
            expect(isValidColor).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid shadow values for all shadow tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.keys(softUITokens.shadows)
        ),
        (shadowKey) => {
          const shadowValue = softUITokens.shadows[shadowKey as keyof typeof softUITokens.shadows];
          
          // Shadow should be a non-empty string
          expect(typeof shadowValue).toBe('string');
          expect(shadowValue.length).toBeGreaterThan(0);
          
          // Should contain valid shadow syntax
          expect(shadowValue).toMatch(/\d+px/); // Contains pixel values
          expect(shadowValue).toMatch(/rgba?\(/); // Contains rgba or rgb
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid border radius values for all radius tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.keys(softUITokens.borderRadius)
        ),
        (radiusKey) => {
          const radiusValue = softUITokens.borderRadius[radiusKey as keyof typeof softUITokens.borderRadius];
          
          // Radius should be a non-empty string
          expect(typeof radiusValue).toBe('string');
          expect(radiusValue.length).toBeGreaterThan(0);
          
          // Should be valid CSS border-radius (px or special values)
          const isValidRadius = 
            /^\d+px$/.test(radiusValue) || // pixel value
            radiusValue === '9999px'; // pill shape
          
          expect(isValidRadius).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid transition timing for all transition tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.keys(softUITokens.transitions)
        ),
        (transitionKey) => {
          const transitionValue = softUITokens.transitions[transitionKey as keyof typeof softUITokens.transitions];
          
          // Transition should be a non-empty string
          expect(typeof transitionValue).toBe('string');
          expect(transitionValue.length).toBeGreaterThan(0);
          
          // Should contain timing in ms and cubic-bezier
          expect(transitionValue).toMatch(/\d+ms/);
          expect(transitionValue).toMatch(/cubic-bezier/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid spacing values for all spacing tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.keys(softUITokens.spacing)
        ),
        (spacingKey) => {
          const spacingValue = softUITokens.spacing[spacingKey as keyof typeof softUITokens.spacing];
          
          // Spacing should be a non-empty string
          expect(typeof spacingValue).toBe('string');
          expect(spacingValue.length).toBeGreaterThan(0);
          
          // Should be valid CSS spacing (rem)
          expect(spacingValue).toMatch(/^[\d.]+rem$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid font size values for all typography tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.keys(softUITokens.typography.fontSize)
        ),
        (sizeKey) => {
          const sizeValue = softUITokens.typography.fontSize[sizeKey as keyof typeof softUITokens.typography.fontSize];
          
          // Font size should be a non-empty string
          expect(typeof sizeValue).toBe('string');
          expect(sizeValue.length).toBeGreaterThan(0);
          
          // Should be valid CSS font size (rem)
          expect(sizeValue).toMatch(/^[\d.]+rem$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid font weight values for all weight tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.keys(softUITokens.typography.fontWeight)
        ),
        (weightKey) => {
          const weightValue = softUITokens.typography.fontWeight[weightKey as keyof typeof softUITokens.typography.fontWeight];
          
          // Font weight should be a non-empty string
          expect(typeof weightValue).toBe('string');
          expect(weightValue.length).toBeGreaterThan(0);
          
          // Should be valid CSS font weight (numeric string)
          const weight = parseInt(weightValue, 10);
          expect(weight).toBeGreaterThanOrEqual(100);
          expect(weight).toBeLessThanOrEqual(900);
          expect(weight % 100).toBe(0); // Should be multiple of 100
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid line height values for all line height tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.keys(softUITokens.typography.lineHeight)
        ),
        (lineHeightKey) => {
          const lineHeightValue = softUITokens.typography.lineHeight[lineHeightKey as keyof typeof softUITokens.typography.lineHeight];
          
          // Line height should be a non-empty string
          expect(typeof lineHeightValue).toBe('string');
          expect(lineHeightValue.length).toBeGreaterThan(0);
          
          // Should be valid CSS line height (unitless number)
          const lineHeight = parseFloat(lineHeightValue);
          expect(lineHeight).toBeGreaterThan(0);
          expect(lineHeight).toBeLessThanOrEqual(3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid breakpoint values for all breakpoint tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.keys(softUITokens.breakpoints)
        ),
        (breakpointKey) => {
          const breakpointValue = softUITokens.breakpoints[breakpointKey as keyof typeof softUITokens.breakpoints];
          
          // Breakpoint should be a non-empty string
          expect(typeof breakpointValue).toBe('string');
          expect(breakpointValue.length).toBeGreaterThan(0);
          
          // Should be valid CSS breakpoint (px)
          expect(breakpointValue).toMatch(/^\d+px$/);
          
          // Should be reasonable breakpoint value
          const pixels = parseInt(breakpointValue, 10);
          expect(pixels).toBeGreaterThanOrEqual(320); // Min mobile
          expect(pixels).toBeLessThanOrEqual(2560); // Max desktop
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid z-index values for all z-index tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.keys(softUITokens.zIndex)
        ),
        (zIndexKey) => {
          const zIndexValue = softUITokens.zIndex[zIndexKey as keyof typeof softUITokens.zIndex];
          
          // Z-index should be a number
          expect(typeof zIndexValue).toBe('number');
          
          // Should be non-negative
          expect(zIndexValue).toBeGreaterThanOrEqual(0);
          
          // Should be reasonable z-index value
          expect(zIndexValue).toBeLessThanOrEqual(10000);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional structural tests
  it('should have all required color categories', () => {
    const requiredCategories = ['primary', 'secondary', 'neutral', 'accent'];
    requiredCategories.forEach((category) => {
      expect(softUITokens.colors).toHaveProperty(category);
    });
  });

  it('should have all required shadow types', () => {
    const requiredShadows = ['soft', 'softHover', 'softLarge'];
    requiredShadows.forEach((shadow) => {
      expect(softUITokens.shadows).toHaveProperty(shadow);
    });
  });

  it('should have all required border radius sizes', () => {
    const requiredRadii = ['soft', 'softLarge', 'softXL'];
    requiredRadii.forEach((radius) => {
      expect(softUITokens.borderRadius).toHaveProperty(radius);
    });
  });

  it('should have all required transition timings', () => {
    const requiredTransitions = ['fast', 'base', 'slow'];
    requiredTransitions.forEach((transition) => {
      expect(softUITokens.transitions).toHaveProperty(transition);
    });
  });
});
