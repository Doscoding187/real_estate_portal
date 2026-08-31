import { render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { landDetail, leadMutation, useRoute } = vi.hoisted(() => ({
  landDetail: vi.fn(),
  leadMutation: vi.fn(),
  useRoute: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    landPublic: { detail: { useQuery: (...args: unknown[]) => landDetail(...args) } },
    leads: { create: { useMutation: () => leadMutation() } },
  },
}));

vi.mock('wouter', () => ({
  Link: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRoute: () => useRoute(),
}));

import LandDetail from './LandDetail';

const land = {
  listingId: 901,
  slug: 'serviced-stand-pretoria',
  title: 'Serviced stand in Pretoria',
  description: 'A seller-described Land opportunity with an approximate public location.',
  askingPrice: '950000',
  city: 'Pretoria',
  province: 'Gauteng',
  classification: 'residential_stand',
  intendedUse: 'Residential development',
  precision: 'approximate' as const,
  extentM2: '720',
  parcelCount: 1,
  href: '/land/serviced-stand-pretoria',
  passport: {
    trustState: 'listed_with_disclosures' as const,
    claims: [{ code: 'water', state: 'asserted' }],
    assertions: [],
  },
  media: [{ url: 'https://cdn.example.com/stand.jpg', isPrimary: true, displayOrder: 0 }],
};

describe('LandDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRoute.mockReturnValue([true, { slug: 'serviced-stand-pretoria' }]);
    landDetail.mockReturnValue({ data: land, isLoading: false, error: null });
  });

  it('does not promise direct delivery when the server holds an enquiry for recipient verification', () => {
    leadMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
      data: {
        deliveryStatus: 'attention_required',
        leadCustody: 'attention_required',
        recipientType: 'manual',
        recipientId: null,
      },
    });

    render(<LandDetail />);

    expect(landDetail).toHaveBeenCalledWith(
      { slug: 'serviced-stand-pretoria' },
      { enabled: true },
    );
    expect(screen.getByRole('img', { name: 'Serviced stand in Pretoria' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/stand.jpg',
    );
    expect(screen.getByText('Water: Seller declared')).toBeInTheDocument();
    expect(screen.getByText(/remains verified and deliverable/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Recipient verification is required before direct contact.',
    );
  });

  it('confirms direct delivery only for a verified recipient response', () => {
    leadMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
      data: {
        deliveryStatus: 'delivered',
        leadCustody: 'verified_customer_recipient',
        recipientType: 'agent',
        recipientId: 44,
      },
    });

    render(<LandDetail />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Your enquiry has been recorded and sent to the approved Land marketing representative.',
    );
  });
});
