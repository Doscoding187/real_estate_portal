import { buildDevelopmentCanonicalEditSnapshot } from '../lib/developmentCanonicalSnapshot';

const parseJson = <T,>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export function buildCanonicalRentalEditSnapshotFixture(
  overrides: {
    id?: number;
    name?: string;
    description?: string;
  } = {},
) {
  return buildDevelopmentCanonicalEditSnapshot({
    dev: {
      id: overrides.id ?? 789,
      name: overrides.name ?? 'Canonical Rental Edit',
      description:
        overrides.description ?? 'A DB edit snapshot that should survive manual Save Draft.',
      city: 'Cape Town',
      province: 'Western Cape',
      suburb: 'Sea Point',
      address: '9 Ocean View',
      postalCode: '8005',
      developmentType: 'residential',
      transactionType: 'for_rent',
      status: 'planning',
      nature: 'new',
      ownershipType: 'sectional-title',
      propertyTypes: JSON.stringify(['apartment']),
      monthlyRentFrom: '14500.00',
      monthlyRentTo: '18000.00',
      priceFrom: '2500000.00',
      priceTo: '2700000.00',
    },
    media: {
      heroImage: { id: 'hero-rent', url: 'https://example.com/rental-hero.jpg' },
      photos: [{ id: 'photo-rent', url: 'https://example.com/rental-photo.jpg' }],
      videos: [],
      documents: [{ id: 'brochure-rent', url: 'https://example.com/rental-brochure.pdf' }],
    },
    amenities: ['Pool'],
    highlights: ['Managed rental inventory'],
    features: ['Backup power'],
    unitTypes: [
      {
        id: 'rent-unit-db-1',
        name: 'Rental Type A',
        bedrooms: '2',
        bathrooms: '2',
        monthlyRentFrom: '14500.00',
        monthlyRentTo: '18000.00',
        basePriceFrom: '2500000.00',
        startingBid: '900000.00',
        unitSize: '84',
        parkingType: 'covered',
        parkingBays: '1',
        totalUnits: '12',
        availableUnits: '8',
        reservedUnits: '2',
      },
    ],
    parseJson,
  });
}
