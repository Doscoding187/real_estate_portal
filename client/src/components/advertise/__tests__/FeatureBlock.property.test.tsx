/**
 * Property-Based Tests for FeatureBlock Component
 * 
 * Feature: advertise-with-us-landing, Property 6: Feature block structure
 * Validates: Requirements 3.3
 * 
 * Tests that for any feature block rendered on the page, the block contains
 * exactly three elements: a soft-UI icon, a headline, and descriptive text.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureBlock } from '../FeatureBlock';
import { Target, Sparkles, CheckCircle, BarChart3, Home, Users } from 'lucide-react';
import fc from 'fast-check';

describe('FeatureBlock - Property 6: Feature block structure', () => {
  /**
   * Property 6: Feature block structure
   * For any feature block, the block should contain exactly three elements:
   * a soft-UI icon, a headline, and descriptive text
   */
  it('should contain icon, headline, and description for any feature data', () => {
    fc.assert(
      fc.property(
        // Generate random feature data
        fc.record({
          icon: fc.constantFrom(Target, Sparkles, CheckCircle, BarChart3, Home, Users),
          headline: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 20, maxLength: 200 }),
          index: fc.integer({ min: 0, max: 10 }),
        }),
        (featureData) => {
          // Render the feature block
          const { container, unmount } = render(
            <FeatureBlock
              icon={featureData.icon}
              headline={featureData.headline}
              description={featureData.description}
              index={featureData.index}
            />
          );

          try {
            // Verify the block contains exactly three elements:
            
            // 1. Icon - check for SVG element (Lucide icons render as SVG)
            const svgElements = container.querySelectorAll('svg');
            expect(svgElements.length).toBeGreaterThanOrEqual(1);
            
            // 2. Headline - check for h3 element with the headline text
            const headings = container.querySelectorAll('h3');
            expect(headings.length).toBe(1);
            expect(headings[0].textContent).toBe(featureData.headline);
            
            // 3. Description - check for paragraph with description text
            const paragraphs = container.querySelectorAll('p');
            expect(paragraphs.length).toBe(1);
            expect(paragraphs[0].textContent).toBe(featureData.description);
          } finally {
            // Clean up after each render
            unmount();
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Additional property: Icon container has soft-UI styling
   */
  it('should have soft-UI icon container styling for any feature', () => {
    fc.assert(
      fc.property(
        fc.record({
          icon: fc.constantFrom(Target, Sparkles, CheckCircle, BarChart3),
          headline: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 20, maxLength: 200 }),
          index: fc.integer({ min: 0, max: 10 }),
        }),
        (featureData) => {
          const { container } = render(
            <FeatureBlock
              icon={featureData.icon}
              headline={featureData.headline}
              description={featureData.description}
              index={featureData.index}
            />
          );

          // Find the icon container (first div with specific dimensions)
          const iconContainers = container.querySelectorAll('div');
          const iconContainer = Array.from(iconContainers).find(
            (div) => {
              const style = window.getComputedStyle(div);
              return style.width === '72px' && style.height === '72px';
            }
          );

          expect(iconContainer).toBeDefined();
          
          // Verify soft-UI styling properties
          if (iconContainer) {
            const style = window.getComputedStyle(iconContainer);
            
            // Should have border radius (rounded corners)
            expect(style.borderRadius).toBeTruthy();
            
            // Should have background color
            expect(style.backgroundColor).toBeTruthy();
            
            // Should use flexbox for centering
            expect(style.display).toBe('flex');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Headline and description have proper typography
   */
  it('should have proper typography hierarchy for any feature', () => {
    fc.assert(
      fc.property(
        fc.record({
          icon: fc.constantFrom(Target, Sparkles),
          headline: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 20, maxLength: 200 }),
          index: fc.integer({ min: 0, max: 3 }),
        }),
        (featureData) => {
          const { container, unmount } = render(
            <FeatureBlock
              icon={featureData.icon}
              headline={featureData.headline}
              description={featureData.description}
              index={featureData.index}
            />
          );

          try {
            // Headline should be h3
            const headings = container.querySelectorAll('h3');
            expect(headings.length).toBe(1);
            const headline = headings[0];
            
            // Description should be a paragraph
            const paragraphs = container.querySelectorAll('p');
            expect(paragraphs.length).toBe(1);
            const description = paragraphs[0];
            expect(description.textContent).toBe(featureData.description);
            
            // Headline should come before description in DOM order
            const headlinePosition = headline.compareDocumentPosition(description);
            expect(headlinePosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Empty strings should still render structure
   */
  it('should maintain structure even with minimal content', () => {
    const { container } = render(
      <FeatureBlock
        icon={Target}
        headline=""
        description=""
        index={0}
      />
    );

    // Should still have icon
    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThanOrEqual(1);
    
    // Should still have h3 (even if empty)
    const headings = container.querySelectorAll('h3');
    expect(headings.length).toBe(1);
    
    // Should still have paragraph (even if empty)
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(1);
  });
});
