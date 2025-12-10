/**
 * Property-Based Tests for MetricCard Component
 * 
 * **Feature: advertise-with-us-landing, Property 11: Metric structure**
 * **Validates: Requirements 6.3**
 * 
 * Property: For any metric displayed in the social proof section,
 * the metric should contain both a numeric value and a descriptive label
 */

import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { fc } from '@fast-check/vitest';
import { MetricCard } from '../MetricCard';
import { TrendingUp, Users, Star, Award } from 'lucide-react';

describe('MetricCard - Property 11: Metric structure', () => {
  /**
   * Property Test: Metric completeness
   * 
   * For any metric data (value and label), the rendered MetricCard
   * should contain both the value and the label in the DOM
   */
  it('should contain both value and label for any metric data', () => {
    fc.assert(
      fc.property(
        // Generate random metric values (numbers or formatted strings)
        fc.oneof(
          fc.integer({ min: 0, max: 1000000 }),
          fc.constantFrom('10K+', '95%', '5M+', '99.9%', '24/7', '100+')
        ),
        // Generate random labels with alphanumeric characters
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => {
          const trimmed = s.trim();
          return trimmed.length >= 5 && /[a-zA-Z0-9]/.test(trimmed);
        }),
        (value, label) => {
          const { container } = render(
            <MetricCard
              value={value}
              label={label}
              enableCountUp={false} // Disable animation for testing
            />
          );

          try {
            // Check that value is present in the DOM
            const valueElement = container.querySelector('[class*="text-5xl"]');
            expect(valueElement).toBeTruthy();
            expect(valueElement?.textContent).toBeTruthy();

            // Check that label is present in the DOM
            const labelElement = container.querySelector('p');
            expect(labelElement).toBeTruthy();
            expect(labelElement?.textContent).toBe(label);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Value display
   * 
   * For any numeric or string value, the MetricCard should display
   * the value in a large, prominent format
   */
  it('should display value in large prominent format', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 0, max: 1000000 }),
          fc.constantFrom('10K+', '95%', '5M+', '99.9%')
        ),
        fc.string({ minLength: 5, maxLength: 30 }),
        (value, label) => {
          const { container } = render(
            <MetricCard
              value={value}
              label={label}
              enableCountUp={false}
            />
          );

          // Value should be in a large text element
          const valueElement = container.querySelector('[class*="text-5xl"]');
          expect(valueElement).toBeTruthy();
          
          // Value should have gradient styling
          const hasGradient = valueElement?.getAttribute('style')?.includes('gradient');
          expect(hasGradient).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Label display
   * 
   * For any label text, the MetricCard should display the label
   * in a readable format below the value
   */
  it('should display label in readable format below value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.string({ minLength: 10, maxLength: 50 }).filter(s => {
          const trimmed = s.trim();
          return trimmed.length >= 10 && /[a-zA-Z0-9]/.test(trimmed);
        }),
        (value, label) => {
          const { container } = render(
            <MetricCard
              value={value}
              label={label}
              enableCountUp={false}
            />
          );

          try {
            const labelElement = container.querySelector('p');
            expect(labelElement).toBeTruthy();
            expect(labelElement?.textContent).toBe(label);
            
            // Label should be in a paragraph element
            expect(labelElement?.tagName).toBe('P');
            
            // Label should have appropriate text styling
            const hasTextStyling = labelElement?.className.includes('text-');
            expect(hasTextStyling).toBe(true);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Optional icon display
   * 
   * When an icon is provided, the MetricCard should display it
   * above the value
   */
  it('should display optional icon when provided', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.string({ minLength: 5, maxLength: 30 }),
        fc.constantFrom(TrendingUp, Users, Star, Award),
        (value, label, Icon) => {
          const { container } = render(
            <MetricCard
              value={value}
              label={label}
              icon={Icon}
              enableCountUp={false}
            />
          );

          // Icon should be present (SVG element)
          const svgElement = container.querySelector('svg');
          expect(svgElement).toBeTruthy();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test: Icon color variants
   * 
   * For any icon color variant, the icon should be rendered
   * with the appropriate color styling
   */
  it('should apply correct color to icon based on iconColor prop', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.string({ minLength: 5, maxLength: 30 }),
        fc.constantFrom('primary', 'secondary', 'blue', 'green', 'yellow', 'purple') as fc.Arbitrary<'primary' | 'secondary' | 'blue' | 'green' | 'yellow' | 'purple'>,
        (value, label, iconColor) => {
          const { container } = render(
            <MetricCard
              value={value}
              label={label}
              icon={TrendingUp}
              iconColor={iconColor}
              enableCountUp={false}
            />
          );

          const svgElement = container.querySelector('svg');
          expect(svgElement).toBeTruthy();
          
          // Icon should have color styling
          const hasColorStyle = svgElement?.getAttribute('style')?.includes('color');
          expect(hasColorStyle).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test: Responsive layout
   * 
   * For any metric data, the MetricCard should have responsive
   * classes for different screen sizes
   */
  it('should have responsive classes for different screen sizes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.string({ minLength: 5, maxLength: 30 }).filter(s => {
          const trimmed = s.trim();
          return trimmed.length >= 5 && /[a-zA-Z0-9]/.test(trimmed);
        }),
        (value, label) => {
          const { container } = render(
            <MetricCard
              value={value}
              label={label}
              enableCountUp={false}
            />
          );

          try {
            // Value should have responsive text sizing
            const valueElement = container.querySelector('[class*="text-5xl"]');
            expect(valueElement?.className).toMatch(/md:text-6xl/);

            // Label should have responsive text sizing
            const labelElement = container.querySelector('p');
            expect(labelElement?.className).toMatch(/md:text-lg/);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Accessibility
   * 
   * For any metric, the component should be accessible with
   * proper semantic HTML structure
   */
  it('should use semantic HTML for accessibility', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.string({ minLength: 5, maxLength: 30 }).filter(s => {
          const trimmed = s.trim();
          return trimmed.length >= 5 && /[a-zA-Z0-9]/.test(trimmed);
        }),
        (value, label) => {
          const { container } = render(
            <MetricCard
              value={value}
              label={label}
              enableCountUp={false}
            />
          );

          try {
            // Label should be in a paragraph element
            const labelElement = container.querySelector('p');
            expect(labelElement?.tagName).toBe('P');

            // Container should be a div with proper structure
            const containerDiv = container.firstChild;
            expect(containerDiv).toBeTruthy();
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
