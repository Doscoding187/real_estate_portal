import { describe, expect, it } from 'vitest';

import {
  normalizeCardListingType,
  normalizePropertyForUI,
  searchCardResultToPropertyCardProps,
} from './normalizers';

describe('property card normalizers', () => {
  it('canonicalizes listing type aliases before cards render', () => {
    expect(normalizeCardListingType('to-rent')).toBe('rent');
    expect(normalizeCardListingType('for_rent')).toBe('rent');
    expect(normalizeCardListingType('auctions')).toBe('auction');
    expect(normalizeCardListingType('for_sale')).toBe('sale');
  });

  it('keeps auction intent from development search cards', () => {
    const props = searchCardResultToPropertyCardProps({
      id: 'dev-1-unit-a',
      title: 'Auction Villa',
      price: 2750000,
      location: 'Menlyn, Pretoria',
      image: '/auction.jpg',
      images: [],
      propertyType: 'house',
      listingType: 'auction',
      transactionType: 'auction',
      listingSource: 'development',
      contactRole: 'developer',
      identity: {
        role: 'developer',
        name: 'Builder Group',
        avatarUrl: null,
        phone: null,
        whatsapp: null,
        email: null,
      },
      highlights: [],
    });

    expect(props).toMatchObject({
      listingType: 'auction',
      transactionType: 'auction',
      price: 2750000,
      listingSource: 'development',
    });
  });

  it('carries development unit identity through grid card normalization', () => {
    const props = searchCardResultToPropertyCardProps({
      id: 'dev-1-unit-a',
      href: '/development/demo-development/unit/unit-a',
      title: '2 Bed Apartment',
      price: 1200000,
      location: 'Berea, Johannesburg',
      image: '/unit-a.jpg',
      images: [],
      propertyType: 'apartment',
      listingType: 'sale',
      listingSource: 'development',
      contactRole: 'developer',
      unitTypeId: 'unit-a',
      unitDisplayOrder: 0,
      totalUnits: 8,
      availableUnits: 5,
      identity: {
        role: 'developer',
        name: 'Builder Group',
      },
      development: {
        id: 1,
        name: 'Demo Development',
        slug: 'demo-development',
      },
      highlights: [],
      listedDate: new Date('2026-03-20T00:00:00.000Z'),
    });

    expect(props).toMatchObject({
      href: '/development/demo-development/unit/unit-a',
      listingSource: 'development',
      unitTypeId: 'unit-a',
      unitDisplayOrder: 0,
      totalUnits: 8,
      availableUnits: 5,
    });
  });

  it('carries transaction inventory through grid card normalization', () => {
    const props = searchCardResultToPropertyCardProps({
      id: 'dev-2-rental-a',
      href: '/development/rental-development/unit/rental-a',
      title: 'Rental Studio',
      price: 12500,
      location: 'Rosebank, Johannesburg',
      image: '/rental-a.jpg',
      images: [],
      propertyType: 'apartment',
      listingType: 'rent',
      listingSource: 'development',
      contactRole: 'developer',
      totalUnits: 6,
      availableUnits: 2,
      identity: {
        role: 'developer',
        name: 'Rental Builder',
      },
      highlights: [],
      listedDate: new Date('2026-03-20T00:00:00.000Z'),
    });

    expect(props).toMatchObject({
      listingType: 'rent',
      listingSource: 'development',
      totalUnits: 6,
      availableUnits: 2,
    });
  });

  it('derives an auction transaction label from raw listing aliases', () => {
    const props = normalizePropertyForUI({
      id: 'auction-1',
      title: 'Auction Unit',
      price: 1500000,
      location: 'Pretoria',
      image: '/auction.jpg',
      listingType: 'auctions',
    });

    expect(props).toMatchObject({
      listingType: 'auction',
      transactionType: 'Auction',
    });
  });
});
