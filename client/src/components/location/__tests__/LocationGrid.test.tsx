import { render, screen } from '@testing-library/react';
import { LocationGrid } from '../LocationGrid';
import { describe, it, expect } from 'vitest';
import { Router } from 'wouter';

describe('LocationGrid', () => {
  const mockItems = [
    { id: 1, name: 'Sandton', listingCount: 120, avgPrice: 3000000 },
    { id: 2, name: 'Rosebank', listingCount: 85, avgPrice: 2500000 },
  ];

  const defaultProps = {
    title: 'Popular Areas',
    items: mockItems,
    parentSlug: 'gauteng/johannesburg',
    type: 'suburb' as const,
  };

  it('renders section title', () => {
    render(
      <Router>
        <LocationGrid {...defaultProps} />
      </Router>,
    );
    expect(screen.getByText('Popular Areas')).toBeDefined();
  });

  it('renders all location items', () => {
    render(
      <Router>
        <LocationGrid {...defaultProps} />
      </Router>,
    );

    expect(screen.getByText('Sandton')).toBeDefined();
    expect(screen.getByText('Rosebank')).toBeDefined();
    expect(screen.getByText('120')).toBeDefined(); // Listing count
  });

  it('formats prices correctly', () => {
    render(
      <Router>
        <LocationGrid {...defaultProps} />
      </Router>,
    );

    // 3000000 -> R3.0M
    expect(screen.getByText('R3.0M')).toBeDefined();
  });
});
