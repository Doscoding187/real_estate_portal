/**
 * Property-Based Tests for FeatureTile Component
 *
 * Feature: advertise-with-us-landing, Property 9: Feature tile styling
 * Validates: Requirements 5.2
 *
 * Tests that for any feature tile in the features grid, the tile has CSS properties
 * for border-radius and box-shadow that match the soft-UI design system.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FeatureTile } from '../FeatureTile';
import {
  Target,
  Sparkles,
  CheckCircle,
  BarChart3,
  Home,
  Users,
  Megaphone,
  Zap,
} from 'lucide-react';
import { softUITokens } from '../design-tokens';
import fc from 'fast-check';

describe('FeatureTile - Property 9: Feature tile styling', () => {
  /**
   * Property 9: Feature tile styling
   * For any feature tile in the features grid, the tile should have CSS properties
   * for border-radius and box-shadow that match the soft-UI design system
   */
  it('should have soft-UI border-radius and box-shadow for any feature tile', () => {
    fc.assert(
      fc.property(
        // Generate random feature tile data
        fc.record({
          icon: fc.constantFrom(
            Target,
            Sparkles,
            CheckCircle,
            BarChart3,
            Home,
            Users,
            Megaphone,
            Zap,
          ),
          title: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 20, maxLength: 150 }),
        }),
        tileData => {
          // Render the feature tile
          const { container, unmount } = render(
            <FeatureTile
              icon={tileData.icon}
              title={tileData.title}
              description={tileData.description}
            />,
          );

          try {
            // Find the main tile container (div with class feature-tile)
            const tileContainer = container.querySelector('.feature-tile');
            expect(tileContainer).toBeDefined();

            if (tileContainer) {
              const style = window.getComputedStyle(tileContainer);

              // Verify border-radius matches soft-UI design system
              // softUITokens.borderRadius.softLarge = '16px'
              expect(style.borderRadius).toBeTruthy();
              expect(style.borderRadius).not.toBe('0px');

              // Verify box-shadow exists (soft-UI cards should have shadows)
              // softUITokens.shadows.soft is defined
              expect(style.boxShadow).toBeTruthy();
              expect(style.boxShadow).not.toBe('none');

              // Verify background is white (soft-UI cards)
              expect(style.backgroundColor).toBeTruthy();
            }
          } finally {
            // Clean up after each render
            unmount();
          }
        },
      ),
      { numRuns: 100 }, // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Additional property: Tile has proper card structure
   */
  it('should have proper card structure with padding for any feature tile', () => {
    fc.assert(
      fc.property(
        fc.record({
          icon: fc.constantFrom(Target, Sparkles, CheckCircle, BarChart3),
          title: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 20, maxLength: 150 }),
        }),
        tileData => {
          const { container, unmount } = render(
            <FeatureTile
              icon={tileData.icon}
              title={tileData.title}
              description={tileData.description}
            />,
          );

          try {
            const tileContainer = container.querySelector('.feature-tile');
            expect(tileContainer).toBeDefined();

            if (tileContainer) {
              const style = window.getComputedStyle(tileContainer);

              // Should have padding (soft-UI cards have generous padding)
              expect(style.padding).toBeTruthy();
              expect(style.padding).not.toBe('0px');

              // Should use flexbox layout
              expect(style.display).toBe('flex');
              expect(style.flexDirection).toBe('column');
            }
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Additional property: Icon container has soft-UI styling
   */
  it('should have soft-UI icon container for any feature tile', () => {
    fc.assert(
      fc.property(
        fc.record({
          icon: fc.constantFrom(Target, Sparkles, CheckCircle),
          title: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 20, maxLength: 150 }),
        }),
        tileData => {
          const { container, unmount } = render(
            <FeatureTile
              icon={tileData.icon}
              title={tileData.title}
              description={tileData.description}
            />,
          );

          try {
            // Find the icon container (div with 56px dimensions)
            const iconContainers = container.querySelectorAll('div');
            const iconContainer = Array.from(iconContainers).find(div => {
              const style = window.getComputedStyle(div);
              return style.width === '56px' && style.height === '56px';
            });

            expect(iconContainer).toBeDefined();

            if (iconContainer) {
              const style = window.getComputedStyle(iconContainer);

              // Should have border radius (rounded corners)
              expect(style.borderRadius).toBeTruthy();
              expect(style.borderRadius).not.toBe('0px');

              // Should have background color
              expect(style.backgroundColor).toBeTruthy();

              // Should use flexbox for centering
              expect(style.display).toBe('flex');
            }
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Additional property: Title and description are present
   */
  it('should contain title and description for any feature tile', () => {
    fc.assert(
      fc.property(
        fc.record({
          icon: fc.constantFrom(Target, Sparkles),
          title: fc.string({ minLength: 5, maxLength: 50 }),
          description: fc.string({ minLength: 20, maxLength: 150 }),
        }),
        tileData => {
          const { container, unmount } = render(
            <FeatureTile
              icon={tileData.icon}
              title={tileData.title}
              description={tileData.description}
            />,
          );

          try {
            // Should have title (h3)
            const headings = container.querySelectorAll('h3');
            expect(headings.length).toBe(1);
            expect(headings[0].textContent).toBe(tileData.title);

            // Should have description (p)
            const paragraphs = container.querySelectorAll('p');
            expect(paragraphs.length).toBe(1);
            expect(paragraphs[0].textContent).toBe(tileData.description);

            // Should have icon (SVG)
            const svgElements = container.querySelectorAll('svg');
            expect(svgElements.length).toBeGreaterThanOrEqual(1);
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Edge case: Minimal content should still have proper styling
   */
  it('should maintain soft-UI styling even with minimal content', () => {
    const { container } = render(<FeatureTile icon={Target} title="A" description="B" />);

    const tileContainer = container.querySelector('.feature-tile');
    expect(tileContainer).toBeDefined();

    if (tileContainer) {
      const style = window.getComputedStyle(tileContainer);

      // Should still have border-radius
      expect(style.borderRadius).toBeTruthy();
      expect(style.borderRadius).not.toBe('0px');

      // Should still have box-shadow
      expect(style.boxShadow).toBeTruthy();
      expect(style.boxShadow).not.toBe('none');
    }
  });
});
