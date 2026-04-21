/**
 * Property-Based Tests for CategoryCard component
 *
 * Feature: services-marketplace-overhaul, Property 1: CategoryCard renders all required fields
 *
 * Property 1: CategoryCard renders all required fields
 * For any ServiceCategoryMeta object, rendering a CategoryCard with that metadata
 * should produce output that contains the category's label and subtitle.
 * Validates: Requirements 1.2
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import { CategoryCard } from '../CategoryCard';
import { SERVICE_CATEGORIES } from '@/features/services/catalog';

// Feature: services-marketplace-overhaul, Property 1: CategoryCard renders all required fields
describe('CategoryCard', () => {
  it('Property 1: renders the category label for any ServiceCategoryMeta from SERVICE_CATEGORIES', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        const onClick = vi.fn();
        const { container } = render(<CategoryCard category={category} onClick={onClick} />);

        // The label should be present in the rendered output
        expect(screen.getByText(category.label)).toBeInTheDocument();

        // Cleanup
        container.remove();
      }),
      { numRuns: 20 },
    );
  });

  it('Property 1: renders the category subtitle for any ServiceCategoryMeta from SERVICE_CATEGORIES', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        const onClick = vi.fn();
        const { container } = render(<CategoryCard category={category} onClick={onClick} />);

        // The subtitle should be present in the rendered output
        expect(screen.getByText(category.subtitle)).toBeInTheDocument();

        // Cleanup
        container.remove();
      }),
      { numRuns: 20 },
    );
  });

  it('Property 1: both label and subtitle are present for any ServiceCategoryMeta from SERVICE_CATEGORIES', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SERVICE_CATEGORIES), category => {
        const onClick = vi.fn();
        const { container } = render(<CategoryCard category={category} onClick={onClick} />);

        const labelEl = screen.getByText(category.label);
        const subtitleEl = screen.getByText(category.subtitle);

        expect(labelEl).toBeInTheDocument();
        expect(subtitleEl).toBeInTheDocument();

        // Cleanup
        container.remove();
      }),
      { numRuns: 20 },
    );
  });
});

// Smoke / unit tests
describe('CategoryCard - unit tests', () => {
  it('renders a button with the correct aria-label', () => {
    const category = SERVICE_CATEGORIES[0];
    const onClick = vi.fn();
    render(<CategoryCard category={category} onClick={onClick} />);

    const button = screen.getByRole('button', { name: category.label });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick with the category value when clicked', async () => {
    const category = SERVICE_CATEGORIES[0];
    const onClick = vi.fn();
    const { user } = render(<CategoryCard category={category} onClick={onClick} />);

    const button = screen.getByRole('button', { name: category.label });
    button.click();

    expect(onClick).toHaveBeenCalledWith(category.value);
  });

  it('renders all six categories without errors', () => {
    SERVICE_CATEGORIES.forEach(category => {
      const onClick = vi.fn();
      const { container } = render(<CategoryCard category={category} onClick={onClick} />);
      expect(screen.getByText(category.label)).toBeInTheDocument();
      expect(screen.getByText(category.subtitle)).toBeInTheDocument();
      container.remove();
    });
  });
});
