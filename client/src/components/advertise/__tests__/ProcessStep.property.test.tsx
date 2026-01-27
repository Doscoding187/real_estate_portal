/**
 * Property-Based Tests for ProcessStep Component
 *
 * Feature: advertise-with-us-landing, Property 8: Process step structure
 * Validates: Requirements 4.2
 *
 * Tests that any process step contains exactly three elements:
 * an icon, a step title, and a brief description
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProcessStep } from '../ProcessStep';
import { UserPlus, FileText, TrendingUp } from 'lucide-react';
import fc from 'fast-check';

describe('ProcessStep Property Tests', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Property 8: Process step structure
   * For any step in the "How It Works" section, the step should contain
   * exactly three elements: an icon, a step title, and a brief description
   */
  it('should contain icon, title, and description for any valid process step', () => {
    fc.assert(
      fc.property(
        // Generate random step numbers (1-10)
        fc.integer({ min: 1, max: 10 }),
        // Generate random titles (alphanumeric strings with spaces)
        fc.stringMatching(/^[a-zA-Z0-9 ]{5,50}$/).filter(s => s.trim().length >= 5),
        // Generate random descriptions (alphanumeric strings with spaces)
        fc.stringMatching(/^[a-zA-Z0-9 ]{10,200}$/).filter(s => s.trim().length >= 10),
        // Generate random icon selection
        fc.constantFrom(UserPlus, FileText, TrendingUp),
        (stepNumber, title, description, Icon) => {
          cleanup(); // Clean up before each render

          const { container } = render(
            <ProcessStep
              stepNumber={stepNumber}
              icon={Icon}
              title={title}
              description={description}
            />,
          );

          // Check that the step number is displayed
          const numberBadges = screen.queryAllByText(stepNumber.toString());
          expect(numberBadges.length).toBeGreaterThan(0);

          // Check that the title is displayed
          const h3Elements = container.querySelectorAll('h3');
          const titleElement = Array.from(h3Elements).find(
            el => el.textContent?.trim() === title.trim(),
          );
          expect(titleElement).toBeTruthy();
          expect(titleElement?.tagName).toBe('H3');

          // Check that the description is displayed
          const pElements = container.querySelectorAll('p');
          const descriptionElement = Array.from(pElements).find(
            el => el.textContent?.trim() === description.trim(),
          );
          expect(descriptionElement).toBeTruthy();
          expect(descriptionElement?.tagName).toBe('P');

          // Check that an icon is rendered (SVG element)
          const svgElements = container.querySelectorAll('svg');
          expect(svgElements.length).toBeGreaterThan(0);

          // Verify all three required elements are present
          const hasNumberBadge = numberBadges.length > 0;
          const hasTitle = titleElement !== null;
          const hasDescription = descriptionElement !== null;
          const hasIcon = svgElements.length > 0;

          expect(hasNumberBadge && hasTitle && hasDescription && hasIcon).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should maintain structure with different step numbers', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), stepNumber => {
        cleanup(); // Clean up before each render

        render(
          <ProcessStep
            stepNumber={stepNumber}
            icon={UserPlus}
            title="Test Step"
            description="Test description for the step"
          />,
        );

        // Verify step number is displayed
        const numberElements = screen.queryAllByText(stepNumber.toString());
        expect(numberElements.length).toBeGreaterThan(0);

        // Verify other elements are still present
        expect(screen.getByText('Test Step')).toBeTruthy();
        expect(screen.getByText('Test description for the step')).toBeTruthy();
      }),
      { numRuns: 50 },
    );
  });

  it('should render with gradient background on number badge', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), stepNumber => {
        cleanup(); // Clean up before each render

        const { container } = render(
          <ProcessStep
            stepNumber={stepNumber}
            icon={UserPlus}
            title="Create Profile"
            description="Set up your account"
          />,
        );

        // Find the number badge container
        const numberBadges = screen.queryAllByText(stepNumber.toString());
        expect(numberBadges.length).toBeGreaterThan(0);

        const badgeContainer = numberBadges[0].parentElement;
        expect(badgeContainer).toBeTruthy();

        // Check for gradient background (inline style)
        const style = badgeContainer?.getAttribute('style');
        expect(style).toContain('gradient');
      }),
      { numRuns: 50 },
    );
  });

  it('should handle edge case: very long titles and descriptions', () => {
    const longTitle = 'A'.repeat(100);
    const longDescription = 'B'.repeat(500);

    const { container } = render(
      <ProcessStep
        stepNumber={1}
        icon={UserPlus}
        title={longTitle}
        description={longDescription}
      />,
    );

    // Verify all elements are still rendered
    expect(screen.getByText(longTitle)).toBeTruthy();
    expect(screen.getByText(longDescription)).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();

    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('should render connector line when showConnector is true', () => {
    const { container } = render(
      <ProcessStep
        stepNumber={1}
        icon={UserPlus}
        title="Step One"
        description="First step description"
        showConnector={true}
      />,
    );

    // Check for connector line element
    const connectorLine = container.querySelector('.connector-line');
    expect(connectorLine).toBeTruthy();
  });

  it('should not render connector line when showConnector is false', () => {
    const { container } = render(
      <ProcessStep
        stepNumber={1}
        icon={UserPlus}
        title="Step One"
        description="First step description"
        showConnector={false}
      />,
    );

    // Check that connector line is not present
    const connectorLine = container.querySelector('.connector-line');
    expect(connectorLine).toBeNull();
  });
});
