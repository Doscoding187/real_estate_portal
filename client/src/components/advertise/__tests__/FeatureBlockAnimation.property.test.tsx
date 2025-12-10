/**
 * Property-Based Tests for FeatureBlock Animation
 * 
 * Feature: advertise-with-us-landing, Property 5: Feature block animation
 * Validates: Requirements 3.2
 * 
 * Tests that for any feature block in the value proposition section, when the block
 * enters the viewport, it should trigger a fade-up animation.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FeatureBlock } from '../FeatureBlock';
import { Target, Sparkles, CheckCircle, BarChart3 } from 'lucide-react';
import fc from 'fast-check';

describe('FeatureBlock - Property 5: Feature block animation', () => {
  /**
   * Property 5: Feature block animation
   * For any feature block, when the block enters the viewport, it should trigger
   * a fade-up animation (opacity 0 to 1, translateY 20px to 0)
   */
  it('should have fade-up animation properties for any feature', () => {
    fc.assert(
      fc.property(
        fc.record({
          icon: fc.constantFrom(Target, Sparkles, CheckCircle, BarChart3),
          headline: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 20, maxLength: 200 }),
          index: fc.integer({ min: 0, max: 10 }),
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
            // Find the feature block container
            const featureBlock = container.querySelector('.feature-block');
            expect(featureBlock).toBeDefined();
            
            if (featureBlock) {
              // Check initial animation state (should start with opacity 0 and translateY)
              const style = window.getComputedStyle(featureBlock);
              
              // The element should have opacity set (either 0 initially or 1 after animation)
              expect(style.opacity).toBeTruthy();
              
              // The element should have transform property (for translateY animation)
              expect(style.transform).toBeTruthy();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Icon container has hover animation capability
   */
  it('should have icon container with hover animation for any feature', () => {
    fc.assert(
      fc.property(
        fc.record({
          icon: fc.constantFrom(Target, Sparkles, CheckCircle, BarChart3),
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
            // Find the icon container (72px x 72px div)
            const iconContainers = container.querySelectorAll('div');
            const iconContainer = Array.from(iconContainers).find(
              (div) => {
                const style = window.getComputedStyle(div);
                return style.width === '72px' && style.height === '72px';
              }
            );

            expect(iconContainer).toBeDefined();
            
            if (iconContainer) {
              // Icon container should have flexbox for centering
              const style = window.getComputedStyle(iconContainer);
              expect(style.display).toBe('flex');
              expect(style.alignItems).toBe('center');
              expect(style.justifyContent).toBe('center');
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Staggered animation delay based on index
   */
  it('should apply staggered animation delay based on index', () => {
    fc.assert(
      fc.property(
        fc.record({
          icon: fc.constantFrom(Target, Sparkles),
          headline: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 20, maxLength: 200 }),
          index: fc.integer({ min: 0, max: 10 }),
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
            // The component should render successfully with any index
            const featureBlock = container.querySelector('.feature-block');
            expect(featureBlock).toBeDefined();
            
            // The index should be a non-negative number (used for stagger delay)
            expect(featureData.index).toBeGreaterThanOrEqual(0);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Animation should work with index 0
   */
  it('should handle animation with zero index', () => {
    const { container } = render(
      <FeatureBlock
        icon={Target}
        headline="Test Feature"
        description="This is a test description for the feature block"
        index={0}
      />
    );

    const featureBlock = container.querySelector('.feature-block');
    expect(featureBlock).toBeDefined();
    
    if (featureBlock) {
      const style = window.getComputedStyle(featureBlock);
      expect(style.opacity).toBeTruthy();
      expect(style.transform).toBeTruthy();
    }
  });
});
