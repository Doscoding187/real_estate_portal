import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('wouter', () => ({ useLocation: () => ['/', vi.fn()], Link: ({ children }: any) => <a>{children}</a> }));

import { DevelopmentCard } from './DevelopmentCard';

const props: any = {
  id: '5',
  title: 'Baltimore Lifestyle Estate',
  location: 'North Riding, Johannesburg',
  description: 'A very long description that should not replace the tagline on the card.',
  tagline: 'Freestanding family homes',
  image: 'https://cdn/c.jpg',
  unitTypes: [{ id: 'a', bedrooms: 3, label: '71 m²', priceFrom: 1745000 }],
  highlights: ['Security estate', 'Full title', 'Controlled access', 'Near schools', 'Pet friendly', 'A', 'B', 'C'],
  developer: { name: 'Cosmopolitan Projects' },
};

describe('development card', () => {
  it('shows the tagline instead of the description, 3 highlights and "+N more", and no document icon', () => {
    const { container } = render(<DevelopmentCard {...props} publisherTrustLabel="Source cited" />);
    expect(screen.getByTestId('development-card-tagline').textContent).toBe('Freestanding family homes');
    expect(screen.getByText('Security estate')).toBeInTheDocument();
    expect(screen.getByText('Controlled access')).toBeInTheDocument();
    expect(screen.queryByText('Near schools')).toBeNull();
    expect(screen.getByText('+5 more')).toBeInTheDocument();
    // The source label is written out, not shown as a document icon next to the name.
    expect(container.querySelector('.lucide-file-text')).toBeNull();
    expect(screen.getByText('Source cited')).toBeInTheDocument();
  });

  it('falls back to the description only when there is no tagline', () => {
    render(<DevelopmentCard {...props} tagline={null} />);
    expect(screen.getByTestId('development-card-tagline').textContent).toContain('A very long description');
  });

  it('keeps the verified tick for a direct developer', () => {
    render(<DevelopmentCard {...props} publisherTrustLabel="Direct developer" />);
    expect(within(document.body).getByRole('img', { name: 'Direct developer' })).toBeInTheDocument();
  });
});
