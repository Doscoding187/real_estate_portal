import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useQuery } = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    location: {
      getFeaturedListings: { useQuery },
    },
  },
}));

vi.mock('wouter', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselNext: () => null,
  CarouselPrevious: () => null,
}));

vi.mock('@/components/PropertyCard', () => ({
  default: ({ title, identity }: { title: string; identity?: { name?: string } }) => (
    <article>
      <h3>{title}</h3>
      <span>{identity?.name}</span>
    </article>
  ),
}));

import { FeaturedPropertiesCarousel } from '../FeaturedPropertiesCarousel';

const location = {
  id: 'city:12',
  canonicalLocationId: 'city:12',
  name: 'Johannesburg',
  slug: 'johannesburg',
  type: 'city' as const,
  provinceSlug: 'gauteng',
};

const canonicalCard = {
  kind: 'property' as const,
  id: '501',
  propertyId: 501,
  href: '/property/501',
  title: 'Agency-owned family home',
  location: 'Parkhurst, Johannesburg, Gauteng',
  city: 'Johannesburg',
  suburb: 'Parkhurst',
  province: 'Gauteng',
  price: 4_250_000,
  image: '/home.jpg',
  images: [{ url: '/home.jpg', thumbnailUrl: '/home.jpg' }],
  propertyType: 'house' as const,
  listingType: 'sale' as const,
  listingSource: 'manual' as const,
  contactRole: 'agency' as const,
  identity: {
    role: 'agency' as const,
    provenance: 'agency' as const,
    name: 'Canonical Realty',
    agencyId: 44,
  },
  highlights: [],
  listedDate: new Date('2026-08-01T00:00:00.000Z'),
};

describe('FeaturedPropertiesCarousel Buy contract', () => {
  beforeEach(() => {
    useQuery.mockReset();
    useQuery.mockReturnValue({ data: [canonicalCard], isLoading: false });
  });

  it('queries canonical city-scoped Buy cards and preserves their public identity', () => {
    render(<FeaturedPropertiesCarousel location={location} />);

    expect(useQuery).toHaveBeenCalledWith({ locationId: 'city:12', limit: 10 });
    expect(
      screen.getByRole('heading', { name: 'Properties for sale in Johannesburg' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Agency-owned family home')).toBeInTheDocument();
    expect(screen.getByText('Canonical Realty')).toBeInTheDocument();
    expect(screen.queryByText(/top selling/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/high-demand/i)).not.toBeInTheDocument();
  });

  it('links View all into the canonical Buy location journey', () => {
    render(<FeaturedPropertiesCarousel location={location} />);

    const link = screen.getByRole('link', { name: /view all properties for sale/i });
    const url = new URL(link.getAttribute('href') || '', 'https://listify.test');

    expect(url.pathname).toBe('/property-for-sale');
    expect(url.searchParams.get('province')).toBe('gauteng');
    expect(url.searchParams.get('city')).toBe('johannesburg');
    expect(url.searchParams.get('locationId')).toBe('city:12');
  });
});
