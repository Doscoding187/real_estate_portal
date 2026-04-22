/**
 * Property-Based Tests for WizardProgressIndicator component
 *
 * Feature: services-marketplace-overhaul
 * Property 9: LeadRequestFlow step counter reflects current step
 * Property 15: Wizard progress indicator reflects current step
 *
 * Property 9: For any step n in {1, 2, 3}, the rendered indicator displays
 * "Step n of 3" and progress bar fill equals n / 3 * 100%.
 * Validates: Requirements 4.6
 *
 * Property 15: For any step n in {1, 2, 3, 4, 5}, the rendered indicator displays
 * "Step n of 5" and progress bar fill equals n / 5 * 100%.
 * Validates: Requirements 7.2, 13.2, 13.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import { WizardProgressIndicator } from '../WizardProgressIndicator';

// Feature: services-marketplace-overhaul, Property 9: LeadRequestFlow step counter reflects current step
describe('WizardProgressIndicator - Lead Request Flow (3 steps)', () => {
  it('Property 9: displays "Step n of 3" for any step n in {1, 2, 3}', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3 }), currentStep => {
        const { container } = render(
          <WizardProgressIndicator currentStep={currentStep} totalSteps={3} />,
        );

        // Check that the step label is present
        const stepLabel = screen.getByText(`Step ${currentStep} of 3`);
        expect(stepLabel).toBeInTheDocument();

        // Cleanup
        container.remove();
      }),
      { numRuns: 20 },
    );
  });

  it('Property 9: progress bar fill equals (n / 3) * 100% for any step n in {1, 2, 3}', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3 }), currentStep => {
        const { container } = render(
          <WizardProgressIndicator currentStep={currentStep} totalSteps={3} />,
        );

        const expectedPercentage = (currentStep / 3) * 100;

        // Find the progress bar fill element
        const progressBar = container.querySelector('[role="progressbar"]');
        expect(progressBar).toBeInTheDocument();

        const fillElement = progressBar?.querySelector('div');
        expect(fillElement).toBeInTheDocument();

        // Check the width style
        const width = fillElement?.style.width;
        expect(width).toBe(`${expectedPercentage}%`);

        // Cleanup
        container.remove();
      }),
      { numRuns: 20 },
    );
  });

  it('Property 9: aria attributes are correct for any step n in {1, 2, 3}', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3 }), currentStep => {
        const { container } = render(
          <WizardProgressIndicator currentStep={currentStep} totalSteps={3} />,
        );

        const progressBar = container.querySelector('[role="progressbar"]');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar?.getAttribute('aria-valuenow')).toBe(String(currentStep));
        expect(progressBar?.getAttribute('aria-valuemin')).toBe('1');
        expect(progressBar?.getAttribute('aria-valuemax')).toBe('3');

        // Cleanup
        container.remove();
      }),
      { numRuns: 20 },
    );
  });
});

// Feature: services-marketplace-overhaul, Property 15: Wizard progress indicator reflects current step
describe('WizardProgressIndicator - Provider Onboarding (5 steps)', () => {
  it('Property 15: displays "Step n of 5" for any step n in {1, 2, 3, 4, 5}', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), currentStep => {
        const { container } = render(
          <WizardProgressIndicator currentStep={currentStep} totalSteps={5} />,
        );

        // Check that the step label is present
        const stepLabel = screen.getByText(`Step ${currentStep} of 5`);
        expect(stepLabel).toBeInTheDocument();

        // Cleanup
        container.remove();
      }),
      { numRuns: 20 },
    );
  });

  it('Property 15: progress bar fill equals (n / 5) * 100% for any step n in {1, 2, 3, 4, 5}', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), currentStep => {
        const { container } = render(
          <WizardProgressIndicator currentStep={currentStep} totalSteps={5} />,
        );

        const expectedPercentage = (currentStep / 5) * 100;

        // Find the progress bar fill element
        const progressBar = container.querySelector('[role="progressbar"]');
        expect(progressBar).toBeInTheDocument();

        const fillElement = progressBar?.querySelector('div');
        expect(fillElement).toBeInTheDocument();

        // Check the width style
        const width = fillElement?.style.width;
        expect(width).toBe(`${expectedPercentage}%`);

        // Cleanup
        container.remove();
      }),
      { numRuns: 20 },
    );
  });

  it('Property 15: aria attributes are correct for any step n in {1, 2, 3, 4, 5}', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), currentStep => {
        const { container } = render(
          <WizardProgressIndicator currentStep={currentStep} totalSteps={5} />,
        );

        const progressBar = container.querySelector('[role="progressbar"]');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar?.getAttribute('aria-valuenow')).toBe(String(currentStep));
        expect(progressBar?.getAttribute('aria-valuemin')).toBe('1');
        expect(progressBar?.getAttribute('aria-valuemax')).toBe('5');

        // Cleanup
        container.remove();
      }),
      { numRuns: 20 },
    );
  });
});

// Combined property test: both lead flow and onboarding scenarios
describe('WizardProgressIndicator - Combined properties', () => {
  it('Properties 9 & 15: step label and progress bar are consistent for any valid step/total combination', () => {
    fc.assert(
      fc.property(
        fc.record({
          totalSteps: fc.constantFrom(3, 5),
          currentStep: fc.nat(),
        }).chain(({ totalSteps, currentStep }) =>
          fc.record({
            totalSteps: fc.constant(totalSteps),
            currentStep: fc.integer({ min: 1, max: totalSteps }),
          }),
        ),
        ({ currentStep, totalSteps }) => {
          const { container } = render(
            <WizardProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />,
          );

          // Check step label
          const stepLabel = screen.getByText(`Step ${currentStep} of ${totalSteps}`);
          expect(stepLabel).toBeInTheDocument();

          // Check progress bar percentage
          const expectedPercentage = (currentStep / totalSteps) * 100;
          const progressBar = container.querySelector('[role="progressbar"]');
          const fillElement = progressBar?.querySelector('div');
          const width = fillElement?.style.width;
          expect(width).toBe(`${expectedPercentage}%`);

          // Cleanup
          container.remove();
        },
      ),
      { numRuns: 20 },
    );
  });
});
