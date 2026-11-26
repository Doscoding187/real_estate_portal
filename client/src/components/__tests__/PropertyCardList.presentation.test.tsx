import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/ComparisonContext', () => ({
  useComparison: () => ({
    addToComparison: vi.fn(),
    removeFromComparison: vi.fn(),
    isInComparison: () => false,
    canAddMore: true,
  }),
}));

import PropertyCardList from '../PropertyCardList';

const base = {
  id: 'preview',
  title: 'Preview home',
  price: 12000,
  location: 'North Riding',
  image: '/x.jpg',
  interactionMode: 'static' as const,
};

describe('PropertyCardList presentation truthfulness', () => {
  afterEach(() => cleanup());

  it('shows "/ month" for a rental and not for a sale', () => {
    const { rerender } = render(<PropertyCardList {...base} listingType="rent" />);
    expect(screen.getByText(/12.?000.*\/ month/)).toBeTruthy();
    rerender(<PropertyCardList {...base} listingType="sell" />);
    expect(screen.queryByText(/\/ month/)).toBeNull();
  });

  it('only says Featured Agent when the agent is really featured', () => {
    const { rerender } = render(
      <PropertyCardList {...base} listingType="sell" agent={{ name: 'Ann' }} />,
    );
    expect(screen.queryByText('Featured Agent')).toBeNull();
    expect(screen.getByText('Property practitioner')).toBeTruthy();
    rerender(
      <PropertyCardList {...base} listingType="sell" agent={{ name: 'Ann', featured: true }} />,
    );
    expect(screen.getByText('Featured Agent')).toBeTruthy();
  });
});
