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
   * The grid should use consistent gap tokens across breakpoints
   */
  it('should have consistent gap spacing in the grid', () => {
    const { container } = render(<ValuePropositionSection />);

    // Find the grid container
    const gridContainers = container.querySelectorAll('div');
    const gridContainer = Array.from(gridContainers).find(div => {
      return div.className.includes('grid');
    });

    expect(gridContainer).toBeDefined();

    if (gridContainer) {
      // Check for grid classes matching the redesigned component
      expect(gridContainer.className).toContain('grid');
      expect(gridContainer.className).toContain('gap-8');
      expect(gridContainer.className).toContain('lg:gap-12');

      // Grid should use responsive columns (3-column layout)
      expect(gridContainer.className).toContain('grid-cols-1');
      expect(gridContainer.className).toContain('md:grid-cols-3');
    }
  });

  /**
   * Additional property: Grid maintains consistent spacing across multiple renders
   */
  it('should maintain grid structure with consistent spacing', () => {
    fc.assert(
      fc.property(
        fc.record({
          renderCount: fc.integer({ min: 1, max: 5 }),
        }),
        testData => {
          for (let i = 0; i < testData.renderCount; i++) {
            const { container, unmount } = render(<ValuePropositionSection />);

            try {
              const gridContainers = container.querySelectorAll('div');
              const gridContainer = Array.from(gridContainers).find(div => {
                return div.className.includes('grid');
              });

              expect(gridContainer).toBeDefined();

              if (gridContainer) {
                // Gap should always be set
                expect(gridContainer.className).toContain('gap-8');
                expect(gridContainer.className).toContain('lg:gap-12');

                // Grid template should use responsive columns
                expect(gridContainer.className).toContain('grid-cols-1');
                expect(gridContainer.className).toContain('md:grid-cols-3');
              }
            } finally {
              unmount();
            }
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Additional property: All feature blocks are rendered in the grid
   */
  it('should render all three feature blocks with consistent spacing', () => {
    const { container } = render(<ValuePropositionSection />);

    // Find all feature blocks via role="listitem"
    const featureBlocks = container.querySelectorAll('[role="listitem"]');

    // Should have exactly 3 feature blocks (redesigned component)
    expect(featureBlocks.length).toBe(3);

    // All feature blocks should be within the grid container
    const gridContainers = container.querySelectorAll('div');
    const gridContainer = Array.from(gridContainers).find(div => {
      return div.className.includes('grid');
    });

    expect(gridContainer).toBeDefined();

    if (gridContainer) {
      // All feature blocks should be within the grid container
      const featureBlocksInGrid = gridContainer.querySelectorAll('[role="listitem"]');
      expect(featureBlocksInGrid.length).toBe(3);

      // Grid template should use responsive columns
      expect(gridContainer.className).toContain('grid-cols-1');
      expect(gridContainer.className).toContain('md:grid-cols-3');
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
