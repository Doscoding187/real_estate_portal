/**
 * Property-Based Tests for LeadRequestFlow component
 *
 * Feature: services-marketplace-overhaul
 *
 * Property 8: LeadRequestFlow never exposes internal jargon
 * For any step (1, 2, 3), the rendered DOM does not contain "intent stage",
 * "source surface", "journey stage", or "source surface" in any visible text node.
 * Validates: Requirements 4.4
 *
 * Property 10: LeadRequestFlow preserves data on back navigation
 * For any combination of entered category, suburb, city, province, and notes,
 * navigating forward to step 3 and back to step 1 preserves all values unchanged.
 * Validates: Requirements 4.7
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LeadRequestFlow } from '../LeadRequestFlow';
import { SERVICE_CATEGORIES, SA_PROVINCES, type ServiceCategory } from '../catalog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Jargon strings that must never appear in the rendered DOM */
const JARGON_STRINGS = ['intent stage', 'source surface', 'journey stage'];

/** Collect all visible text content from the rendered container */
function getAllTextContent(container: HTMLElement): string {
  return container.textContent?.toLowerCase() ?? '';
}

/** Navigate the flow to a specific step by clicking Continue */
function navigateToStep(container: HTMLElement, targetStep: number) {
  for (let step = 1; step < targetStep; step++) {
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueBtn);
  }
}

// ---------------------------------------------------------------------------
// Property 8: LeadRequestFlow never exposes internal jargon
// ---------------------------------------------------------------------------

// Feature: services-marketplace-overhaul, Property 8: LeadRequestFlow never exposes internal jargon
describe('LeadRequestFlow — Property 8: no internal jargon exposed', () => {
  it('does not expose jargon strings on step 1 for any default category', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        const onSubmit = vi.fn();
        const { container } = render(
          <LeadRequestFlow
            defaultCategory={category.value}
            onSubmit={onSubmit}
          />,
        );

        const text = getAllTextContent(container);

        for (const jargon of JARGON_STRINGS) {
          expect(text).not.toContain(jargon);
        }

        container.remove();
      }),
      { numRuns: 10 },
    );
  });

  it('does not expose jargon strings on step 2 for any default category', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        const onSubmit = vi.fn();
        const { container } = render(
          <LeadRequestFlow
            defaultCategory={category.value}
            onSubmit={onSubmit}
          />,
        );

        // Navigate to step 2
        navigateToStep(container, 2);

        const text = getAllTextContent(container);

        for (const jargon of JARGON_STRINGS) {
          expect(text).not.toContain(jargon);
        }

        container.remove();
      }),
      { numRuns: 10 },
    );
  });

  it('does not expose jargon strings on step 3 for any default category', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        const onSubmit = vi.fn();
        const { container } = render(
          <LeadRequestFlow
            defaultCategory={category.value}
            onSubmit={onSubmit}
          />,
        );

        // Navigate to step 3
        navigateToStep(container, 3);

        const text = getAllTextContent(container);

        for (const jargon of JARGON_STRINGS) {
          expect(text).not.toContain(jargon);
        }

        container.remove();
      }),
      { numRuns: 10 },
    );
  });

  it('does not expose jargon strings on any step (combined property)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SERVICE_CATEGORIES),
        fc.integer({ min: 1, max: 3 }),
        (category, targetStep) => {
          const onSubmit = vi.fn();
          const { container } = render(
            <LeadRequestFlow
              defaultCategory={category.value}
              onSubmit={onSubmit}
            />,
          );

          // Navigate to the target step
          navigateToStep(container, targetStep);

          const text = getAllTextContent(container);

          for (const jargon of JARGON_STRINGS) {
            expect(text).not.toContain(jargon);
          }

          container.remove();
        },
      ),
      { numRuns: 10 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: LeadRequestFlow preserves data on back navigation
// ---------------------------------------------------------------------------

// Feature: services-marketplace-overhaul, Property 10: LeadRequestFlow preserves data on back navigation
describe('LeadRequestFlow — Property 10: data preserved on back navigation', () => {
  it('preserves category, suburb, city, province, and notes after navigating to step 3 and back to step 1', () => {
    fc.assert(
      fc.property(
        // Pick a category
        fc.constantFrom(...SERVICE_CATEGORIES),
        // Pick a suburb (non-empty printable string, no commas to avoid parsing issues)
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(',') && s.trim().length > 0),
        // Pick a city
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes(',') && s.trim().length > 0),
        // Pick a province from SA_PROVINCES
        fc.constantFrom(...SA_PROVINCES),
        // Pick notes
        fc.string({ minLength: 0, maxLength: 200 }),
        (category, suburb, city, province, notes) => {
          const onSubmit = vi.fn();
          const { container } = render(
            <LeadRequestFlow
              defaultCategory={category.value}
              onSubmit={onSubmit}
            />,
          );

          // Step 1: select a different category tile if needed (category is already set via defaultCategory)
          // The category tile for the given category should be selectable
          const categoryTile = container.querySelector(
            `[aria-label="${category.label}"]`,
          ) as HTMLButtonElement | null;
          if (categoryTile) {
            fireEvent.click(categoryTile);
          }

          // Navigate to step 2
          const continueBtn1 = screen.getByRole('button', { name: /continue/i });
          fireEvent.click(continueBtn1);

          // Step 2: fill in location fields
          const suburbInput = screen.getByLabelText(/suburb/i) as HTMLInputElement;
          const cityInput = screen.getByLabelText(/city/i) as HTMLInputElement;
          const provinceSelect = screen.getByLabelText(/province/i) as HTMLSelectElement;

          fireEvent.change(suburbInput, { target: { value: suburb } });
          fireEvent.change(cityInput, { target: { value: city } });
          fireEvent.change(provinceSelect, { target: { value: province } });

          // Navigate to step 3
          const continueBtn2 = screen.getByRole('button', { name: /continue/i });
          fireEvent.click(continueBtn2);

          // Step 3: fill in notes
          const notesTextarea = screen.getByPlaceholderText(
            /describe what you need/i,
          ) as HTMLTextAreaElement;
          fireEvent.change(notesTextarea, { target: { value: notes } });

          // Navigate back to step 2
          const backBtn3 = screen.getByRole('button', { name: /back/i });
          fireEvent.click(backBtn3);

          // Verify step 2 values are preserved
          const suburbInputBack = screen.getByLabelText(/suburb/i) as HTMLInputElement;
          const cityInputBack = screen.getByLabelText(/city/i) as HTMLInputElement;
          const provinceSelectBack = screen.getByLabelText(/province/i) as HTMLSelectElement;

          expect(suburbInputBack.value).toBe(suburb);
          expect(cityInputBack.value).toBe(city);
          expect(provinceSelectBack.value).toBe(province);

          // Navigate back to step 1
          const backBtn2 = screen.getByRole('button', { name: /back/i });
          fireEvent.click(backBtn2);

          // Verify step 1 category is preserved
          const selectedTile = container.querySelector('[aria-checked="true"]') as HTMLElement | null;
          expect(selectedTile).not.toBeNull();
          expect(selectedTile?.getAttribute('aria-label')).toBe(category.label);

          // Navigate forward to step 3 again to verify notes are preserved
          const continueBtn1Again = screen.getByRole('button', { name: /continue/i });
          fireEvent.click(continueBtn1Again);

          const continueBtn2Again = screen.getByRole('button', { name: /continue/i });
          fireEvent.click(continueBtn2Again);

          const notesTextareaAgain = screen.getByPlaceholderText(
            /describe what you need/i,
          ) as HTMLTextAreaElement;
          expect(notesTextareaAgain.value).toBe(notes);

          container.remove();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests for LeadRequestFlow
// ---------------------------------------------------------------------------

describe('LeadRequestFlow — unit tests', () => {
  it('renders step 1 with category tiles by default', () => {
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('What service do you need?')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('shows "Step 1 of 3" progress indicator on step 1', () => {
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('Continue button is enabled on step 1 when a category is selected (defaultCategory)', () => {
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        onSubmit={vi.fn()}
      />,
    );

    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).not.toBeDisabled();
  });

  it('navigates to step 2 when Continue is clicked on step 1', () => {
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByLabelText(/suburb/i)).toBeInTheDocument();
  });

  it('navigates to step 3 when Continue is clicked on step 2', () => {
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe what you need/i)).toBeInTheDocument();
  });

  it('shows Submit request button on step 3', () => {
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByRole('button', { name: /submit request/i })).toBeInTheDocument();
  });

  it('disables submit button and shows loading indicator when submitting=true', () => {
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        submitting={true}
        onSubmit={vi.fn()}
      />,
    );

    // Navigate to step 3
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    const submitBtn = screen.getByRole('button', { name: /submitting/i });
    expect(submitBtn).toBeDisabled();
  });

  it('displays inline error above submit button when error prop is provided', () => {
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        error="Something went wrong"
        onSubmit={vi.fn()}
      />,
    );

    // Navigate to step 3
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('calls onSubmit with hardcoded intentStage and sourceSurface', () => {
    const onSubmit = vi.fn();
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        onSubmit={onSubmit}
      />,
    );

    // Navigate to step 3
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intentStage: 'general',
        sourceSurface: 'directory',
      }),
    );
  });

  it('Back button is disabled on step 1', () => {
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
  });

  it('Back button navigates from step 2 to step 1', () => {
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('step content container has aria-live="polite"', () => {
    const { container } = render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        onSubmit={vi.fn()}
      />,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('SA_PROVINCES are rendered in the province select on step 2', () => {
    render(
      <LeadRequestFlow
        defaultCategory="home_improvement"
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    const provinceSelect = screen.getByLabelText(/province/i) as HTMLSelectElement;
    const options = Array.from(provinceSelect.options).map(o => o.value).filter(Boolean);

    expect(options).toEqual(expect.arrayContaining([...SA_PROVINCES]));
  });
});
