import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListingResultCard } from '../ListingResultCard';
import { LISTING_TITLE_MAX_LENGTH } from '@/lib/listingTitleLimit';
import { createListingValidationEngine } from '@/lib/validation/listingValidationRules';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ['/property-for-sale', vi.fn()],
}));
afterEach(cleanup);

const base = {
  id: 'sale-1',
  title: 'Family home',
  location: 'Sandton, Johannesburg',
  price: 2_500_000,
  image: '/sale.jpg',
  listingType: 'sale' as const,
};

describe('ListingResultCard sale layout', () => {
  it('clamps a long legacy title to two lines without cutting the data', () => {
    const longTitle = 'A very long legacy listing headline '.repeat(6).trim();
    render(<ListingResultCard data={{ ...base, title: longTitle }} />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveClass('line-clamp-2');
    expect(heading).toHaveTextContent(longTitle);
    expect(heading).toHaveAttribute('title', longTitle);
  });

  it('shows the supplied description only when there is one', () => {
    const { rerender } = render(
      <ListingResultCard data={{ ...base, description: 'Bright home near the park.' }} />,
    );
    expect(screen.getByText('Bright home near the park.')).toBeInTheDocument();
    rerender(<ListingResultCard data={base} />);
    expect(screen.queryByText('Bright home near the park.')).not.toBeInTheDocument();
  });

  it('shows a parking count only from known data and only without an erf/yard size', () => {
    const parking = {
      key: 'parking',
      label: 'Parking',
      value: '2 parking bays',
      compactValue: '2',
      icon: 'parking' as const,
      status: 'known' as const,
    };
    const { rerender } = render(<ListingResultCard data={{ ...base, parking }} />);
    expect(screen.getByLabelText('2 parking spaces')).toBeInTheDocument();
    rerender(<ListingResultCard data={{ ...base, parking, yardSize: 600 }} />);
    expect(screen.queryByLabelText('2 parking spaces')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Erf or yard area 600 square metres')).toBeInTheDocument();
    rerender(<ListingResultCard data={base} />);
    expect(screen.queryByLabelText(/parking spaces/)).not.toBeInTheDocument();
  });
});

describe('new listing headline limit', () => {
  const validateTitle = (title: string) =>
    createListingValidationEngine().validate('title', title, {} as never);

  it('is 40 characters in the wizard validation rule', async () => {
    expect(LISTING_TITLE_MAX_LENGTH).toBe(40);
    expect(await validateTitle('x'.repeat(LISTING_TITLE_MAX_LENGTH))).toEqual({ isValid: true });
    expect(await validateTitle('x'.repeat(LISTING_TITLE_MAX_LENGTH + 1))).toMatchObject({
      isValid: false,
      error: 'Title must not exceed 40 characters',
    });
  });
});
