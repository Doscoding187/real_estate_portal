import { describe, expect, it } from 'vitest';
import type { SearchCardResult } from '@shared/types';
import { searchCardResultToPropertyCardProps } from './normalizers';

describe('searchCardResultToPropertyCardProps identity contract', () => {
  it('passes explicit agency identity to the grid unchanged without rebuilding an agent', () => {
    const card: SearchCardResult = {
      kind: 'property',
      id: '501',
      propertyId: 501,
      href: '/property/501',
      title: 'Agency-owned family home',
      location: 'Parkhurst, Johannesburg',
      city: 'Johannesburg',
      suburb: 'Parkhurst',
      province: 'Gauteng',
      price: 4_250_000,
      image: '/home.jpg',
      images: [],
      propertyType: 'house',
      listingType: 'sale',
      listingSource: 'manual',
      listerType: 'agency',
      contactRole: 'agency',
      identity: {
        role: 'agency',
        provenance: 'agency',
        name: 'Northside Realty',
        organizationName: 'Northside Realty',
        organizationLogoUrl: '/northside.svg',
        agencyId: 72,
        email: 'enquiries@northside.example',
      },
      highlights: [],
      listedDate: new Date('2026-08-17T00:00:00.000Z'),
    };

    const props = searchCardResultToPropertyCardProps(card);

    expect(props.identity).toEqual(card.identity);
    expect(props.identity?.role).toBe('agency');
    expect(props.agent).toBeUndefined();
  });
});
