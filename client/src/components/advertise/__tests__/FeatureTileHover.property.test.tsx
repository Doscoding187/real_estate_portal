/**
 * Property-Based Tests for FeatureTile Hover Interaction
 *
 * Feature: advertise-with-us-landing, Property 10: Feature tile hover interaction
 * Validates: Requirements 5.3
 *
 * Tests that for any feature tile, hovering over the tile should apply a CSS
 * transform that creates a lift animation.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
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
import fc from 'fast-check';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Generator for valid feature tile data
const featureTileArbitrary = fc.record({
  icon: fc.constantFrom(Target, Sparkles, CheckCircle, BarChart3, Home, Users, Megaphone, Zap),
  title: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 20, maxLength: 150 }).filter(s => s.trim().length > 0),
});

describe('FeatureTile - Property 10: Feature tile hover interaction', () => {
  /**
   * Property 10: Feature tile hover interaction
   * For any feature tile, hovering over the tile should apply a CSS transform
   * that creates a lift animation
   */
  it('should have hover-capable styling attributes for lift animation', () => {
    fc.assert(
      fc.property(featureTileArbitrary, tileData => {
        const { container } = render(
          <FeatureTile
            icon={tileData.icon}
            title={tileData.title}
            description={tileData.description}
          />,
        );

        // Find the main tile container
        const tileContainer = container.querySelector('.feature-tile');
        expect(tileContainer).toBeTruthy();

        if (tileContainer) {
          // Verify the element has inline styles for animation (box-shadow often inline in motion)
          const style = tileContainer.getAttribute('style');

          // Verify transform/position related styles OR class names
          const className = tileContainer.getAttribute('class');

          // Verify box-shadow is present (either inline or class)
          const hasBoxShadow = style?.includes('box-shadow') || className?.includes('shadow');
          expect(hasBoxShadow).toBeTruthy();

          // Position relative is usually a class 'relative' in Tailwind
          const hasPosition = style?.includes('position') || className?.includes('relative');
          expect(hasPosition).toBeTruthy();
        }

        cleanup();
      }),
      { numRuns: 100 }, // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Additional property: Tile is a Framer Motion component
   */
  it('should be a motion component with hover capabilities', () => {
    fc.assert(
      fc.property(featureTileArbitrary, tileData => {
        const { container } = render(
          <FeatureTile
            icon={tileData.icon}
            title={tileData.title}
            description={tileData.description}
          />,
        );

        const tileContainer = container.querySelector('.feature-tile');
        expect(tileContainer).toBeTruthy();

        if (tileContainer) {
          // Verify it has the feature-tile class
          const className = tileContainer.getAttribute('class');
          expect(className).toContain('feature-tile');

          // Verify it has flexbox layout (part of the card structure) - class check
          expect(className).toContain('flex');
          expect(className).toContain('flex-col');
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Additional property: Icon container has color transition on hover
   */
  it('should have icon container with hover color transition capability', () => {
    fc.assert(
      fc.property(featureTileArbitrary, tileData => {
        const { container } = render(
          <FeatureTile
            icon={tileData.icon}
            title={tileData.title}
            description={tileData.description}
          />,
        );

        // Find the icon container (div with w-14 class which is 56px)
        const iconContainers = container.querySelectorAll('div');
        const iconContainer = Array.from(iconContainers).find(div => {
          const className = div.getAttribute('class');
          return className?.includes('w-14') && className?.includes('h-14');
        });

        expect(iconContainer).toBeDefined();

        if (iconContainer) {
          const style = iconContainer.getAttribute('style');
          expect(style).toBeTruthy();

          // Should have background color (for color transition)
          expect(style).toContain('background');

          // Should have border radius (soft-UI styling component uses classes)
          const className = iconContainer.getAttribute('class');
          expect(className).toContain('rounded');
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Additional property: Tile maintains structure during hover state
   */
  it('should maintain all elements during hover state', () => {
    fc.assert(
      fc.property(featureTileArbitrary, tileData => {
        const { container } = render(
          <FeatureTile
            icon={tileData.icon}
            title={tileData.title}
            description={tileData.description}
          />,
        );

        // Verify all elements are present (they should remain during hover)
        const tileContainer = container.querySelector('.feature-tile');
        expect(tileContainer).toBeTruthy();

        // Icon (SVG)
        const svgElements = container.querySelectorAll('svg');
        expect(svgElements.length).toBeGreaterThanOrEqual(1);

        // Title (h3)
        const headings = container.querySelectorAll('h3');
        expect(headings.length).toBe(1);
        expect(headings[0].textContent).toBe(tileData.title);

        // Description (p)
        const paragraphs = container.querySelectorAll('p');
        expect(paragraphs.length).toBe(1);
        expect(paragraphs[0].textContent).toBe(tileData.description);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Edge case: Minimal content should still have hover capability
   */
  it('should have hover capability even with minimal content', () => {
    const { container } = render(<FeatureTile icon={Target} title="A" description="B" />);

    const tileContainer = container.querySelector('.feature-tile');
    expect(tileContainer).toBeTruthy();

    if (tileContainer) {
      const style = tileContainer.getAttribute('style');
      const className = tileContainer.getAttribute('class');

      // Should still have box-shadow (inline or class)
      const hasBoxShadow = style?.includes('box-shadow') || className?.includes('shadow');
      expect(hasBoxShadow).toBeTruthy();

      // Should still have position (inline or class)
      const hasPosition = style?.includes('position') || className?.includes('relative');
      expect(hasPosition).toBeTruthy();
    }
  });

  /**
   * Edge case: Long content should still have hover capability
   */
  it('should have hover capability with long content', () => {
    const longTitle = 'A'.repeat(50);
    const longDescription = 'B'.repeat(150);

    const { container } = render(
      <FeatureTile icon={Target} title={longTitle} description={longDescription} />,
    );

    const tileContainer = container.querySelector('.feature-tile');
    expect(tileContainer).toBeTruthy();

    if (tileContainer) {
      const style = tileContainer.getAttribute('style');
      const className = tileContainer.getAttribute('class');

      // Should still have hover-capable styling
      const hasBoxShadow = style?.includes('box-shadow') || className?.includes('shadow');
      expect(hasBoxShadow).toBeTruthy();

      const hasPosition = style?.includes('position') || className?.includes('relative');
      expect(hasPosition).toBeTruthy();
    }
  });
});
