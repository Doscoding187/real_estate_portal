/**
 * Property-Based Tests for ValuePropositionSection Spacing
 *
 * Feature: advertise-with-us-landing, Property 7: Feature block spacing consistency
 * Validates: Requirements 3.4
 *
 * Tests that for any two adjacent feature blocks in the value proposition section,
 * the spacing between them should be equal to the spacing between any other pair
 * of adjacent blocks.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ValuePropositionSection } from '../ValuePropositionSection';
import fc from 'fast-check';

describe('ValuePropositionSection - Property 7: Feature block spacing consistency', () => {
  /**
   * Property 7: Feature block spacing consistency
   * For any two adjacent feature blocks, the spacing between them should be equal
   * to the spacing between any other pair of adjacent blocks
   */
  it('should have consistent gap spacing in the grid', () => {
    const { container } = render(<ValuePropositionSection />);

    // Find the grid container
    const gridContainers = container.querySelectorAll('div');
    const gridContainer = Array.from(gridContainers).find(div => {
      // const style = window.getComputedStyle(div); // Unused
      return div.className.includes('grid');
    });

    expect(gridContainer).toBeDefined();

    if (gridContainer) {
      // Check for grid classes
      expect(gridContainer.className).toContain('grid');
      expect(gridContainer.className).toContain('gap-6');
      expect(gridContainer.className).toContain('md:gap-8');

      // Grid should use responsive columns
      expect(gridContainer.className).toContain('grid-cols-1');
      expect(gridContainer.className).toContain('sm:grid-cols-2');
      expect(gridContainer.className).toContain('lg:grid-cols-4');
    }
  });

  /**
   * Additional property: Grid maintains consistent spacing across different viewport sizes
   */
  it('should maintain grid structure with consistent spacing', () => {
    fc.assert(
      fc.property(
        // Generate random viewport-like scenarios
        fc.record({
          // We can't actually change viewport in tests, but we can verify the grid structure
          // remains consistent regardless of how many times we render
          renderCount: fc.integer({ min: 1, max: 5 }),
        }),
        testData => {
          // Render multiple times to ensure consistency
          for (let i = 0; i < testData.renderCount; i++) {
            const { container, unmount } = render(<ValuePropositionSection />);

            try {
              // Find the grid container
              const gridContainers = container.querySelectorAll('div');
              const gridContainer = Array.from(gridContainers).find(div => {
                return div.className.includes('grid');
              });

              expect(gridContainer).toBeDefined();

              if (gridContainer) {
                // Gap should always be set
                expect(gridContainer.className).toContain('gap-6');
                expect(gridContainer.className).toContain('md:gap-8');

                // Grid template should use responsive columns
                expect(gridContainer.className).toContain('grid-cols-1');
                expect(gridContainer.className).toContain('sm:grid-cols-2');
                expect(gridContainer.className).toContain('lg:grid-cols-4');
              }
            } finally {
              unmount();
            }
          }
        },
      ),
      { numRuns: 50 }, // Reduced runs since we're rendering multiple times per test
    );
  });

  /**
   * Additional property: All feature blocks are rendered in the grid
   */
  it('should render all four feature blocks with consistent spacing', () => {
    const { container } = render(<ValuePropositionSection />);

    // Find all feature blocks
    const featureBlocks = container.querySelectorAll('.feature-block');

    // Should have exactly 4 feature blocks
    expect(featureBlocks.length).toBe(4);

    // All feature blocks should be within the grid container
    const gridContainers = container.querySelectorAll('div');
    const gridContainer = Array.from(gridContainers).find(div => {
      return div.className.includes('grid');
    });

    expect(gridContainer).toBeDefined();

    if (gridContainer) {
      // All feature blocks should be within the grid container
      // Note: FeatureBlock might be nested inside wrapper divs
      const featureBlocksInGrid = gridContainer.querySelectorAll('.feature-block');

      expect(featureBlocksInGrid.length).toBe(4);

      // Grid template should use responsive columns
      expect(gridContainer.className).toContain('grid-cols-1');
      expect(gridContainer.className).toContain('sm:grid-cols-2');
      expect(gridContainer.className).toContain('lg:grid-cols-4');
    }
  });

  /**
   * Edge case: Section should have proper padding
   */
  it('should have consistent section padding', () => {
    const { container } = render(<ValuePropositionSection />);

    // Find the section element
    const section = container.querySelector('section');
    expect(section).toBeDefined();

    if (section) {
      // Section should have padding
      expect(section.className).toContain('py-20');
      expect(section.className).toContain('md:py-28');

      // Section should have background color
      expect(section.className).toContain('bg-white');
    }
  });
});
