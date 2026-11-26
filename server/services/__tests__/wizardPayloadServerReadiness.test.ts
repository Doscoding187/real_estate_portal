import { describe, expect, it } from 'vitest';
import { buildDevelopmentSubmitPayload } from '../../../client/src/lib/developmentSubmitPayload';
import { residentialSaleWorkflow } from '../../../client/src/lib/workflows/residential-sale';
import { validatePersistedSubmissionReadiness } from '../developmentSubmissionReadiness';
import { serializeEstateSpecsForCreate } from '../developmentService';

const SUBURB_ID = 'place_north_riding_0001';

/** A full sale draft as the wizard holds it (what getWizardData returns). */
const fullSaleDraft = () => ({
  name: 'Baltimore Lifestyle Estate',
  subtitle: 'Freestanding family homes in a lifestyle estate',
  description:
    'A lifestyle security estate in North Riding with freestanding three and four bedroom homes.',
  developmentType: 'residential',
  transactionType: 'for_sale',
  setting: 'estate',
  estateType: 'lifestyle',
  status: 'selling',
  salesStage: 'off_plan',
  ownershipTypes: ['full-title'],
  location: {
    address: '12 Baltimore Road',
    postalCode: '2162',
    latitude: -26.025,
    longitude: 27.946,
    suburbPlaceId: SUBURB_ID,
    suburbLabel: 'North Riding, Johannesburg',
  },
  hasGoverningBody: true,
  governanceType: 'hoa',
  highlights: ['Security estate', 'Full title', 'Controlled access', 'Near schools'],
  heroImage: 'https://cdn.example.com/cover.jpg',
  media: {
    heroImage: { id: 'c', url: 'https://cdn.example.com/cover.jpg', category: 'featured', isPrimary: true },
    photos: [{ id: 'c', url: 'https://cdn.example.com/cover.jpg', category: 'featured', isPrimary: true }],
    videos: [],
    documents: [],
  },
  unitTypes: [
    {
      id: 'u1',
      name: '91 m² 4-bedroom house',
      bedrooms: 4,
      bathrooms: 2,
      unitSize: 91,
      priceFrom: 1930000,
      totalUnits: 50,
      availableUnits: 50,
      reservedUnits: 0,
      parkingType: 'carport',
      parkingBays: 2,
      unitCategory: 'house',
      unitSubType: 'freestanding-house',
      structuralType: 'freestanding-house',
      isActive: true,
    },
  ],
});

/** What the server persists for a create from this payload (the columns readiness reads). */
const persistedFrom = (payload: Record<string, any>) => ({
  development: {
    name: payload.name,
    address: payload.address ?? null,
    latitude: payload.latitude == null ? null : String(payload.latitude),
    longitude: payload.longitude == null ? null : String(payload.longitude),
    // developmentService.createDevelopment stores estateSpecs via serializeEstateSpecsForCreate
    estateSpecs: serializeEstateSpecsForCreate(payload.estateSpecs),
    description: payload.description,
    ownershipType: payload.ownershipType,
    developmentType: payload.developmentType,
    transactionType: payload.transactionType,
    images: JSON.stringify(payload.images ?? []),
    highlights: JSON.stringify(payload.highlights ?? []),
  } as any,
  units: (payload.unitTypes ?? []).map((u: any) => ({
    name: u.name,
    label: u.name,
    isActive: 1,
    totalUnits: u.totalUnits ?? null,
    availableUnits: u.availableUnits ?? null,
    reservedUnits: u.reservedUnits ?? 0,
    priceFrom: u.basePriceFrom ?? null,
    priceTo: u.basePriceTo ?? null,
    basePriceFrom: u.basePriceFrom ?? null,
    basePriceTo: u.basePriceTo ?? null,
    monthlyRentFrom: null,
    monthlyRentTo: null,
    startingBid: null,
    auctionStartDate: null,
    auctionEndDate: null,
    reservePrice: null,
  })) as any[],
});

describe('the wizard payload and the server readiness agree', () => {
  it('a full sale draft the wizard calls ready is accepted by the server readiness rules', () => {
    const draft = fullSaleDraft();
    // The wizard side: every step validates.
    for (const step of residentialSaleWorkflow.steps) {
      if (['review_publish'].includes(step.id)) continue;
      const result = step.validate({ ...draft, stateless: true } as any);
      if (step.id === 'unit_types' || step.id === 'development_media' || step.id === 'location') {
        expect(result.valid, `${step.id}: ${JSON.stringify(result.errors)}`).toBe(true);
      }
    }

    const payload = buildDevelopmentSubmitPayload({
      wizardData: draft as any,
      amenities: ['controlled_gate_access', 'swimming_pool'],
      residentialConfig: { residentialType: 'freehold', communityTypes: ['security_estate_general'] } as any,
      fallbackOwnershipType: 'full-title',
    });

    // The suburb and the Basics/Location facts reach estateSpecs.
    expect(payload.estateSpecs).toMatchObject({
      suburbPlaceId: SUBURB_ID,
      suburbLabel: 'North Riding, Johannesburg',
      setting: 'estate',
      estateType: 'lifestyle',
    });

    const { development, units } = persistedFrom(payload);
    // As stored by create: the suburb is in the persisted estateSpecs JSON.
    expect(JSON.parse(development.estateSpecs as string).suburbPlaceId).toBe(SUBURB_ID);

    // Server readiness with the suburb resolving to an active searchable suburb.
    const blockers = validatePersistedSubmissionReadiness(development, units, {
      suburbPlaceValid: true,
      hasAcceptedSiteAssignment: false,
    });
    expect(blockers).toEqual([]);
  });

  it('without the suburb in the stored estateSpecs the server asks for it (what create used to cause)', () => {
    const payload = buildDevelopmentSubmitPayload({
      wizardData: fullSaleDraft() as any,
      amenities: [],
      residentialConfig: { residentialType: 'freehold', communityTypes: [] } as any,
      fallbackOwnershipType: 'full-title',
    });
    const { development, units } = persistedFrom(payload);
    const lost = { ...development, estateSpecs: null };
    const blockers = validatePersistedSubmissionReadiness(lost, units, {
      suburbPlaceValid: false,
      hasAcceptedSiteAssignment: false,
    });
    expect(blockers.map(b => b.message)).toContain('Choose the suburb from the list.');
  });

  it('estateSpecs is serialised for storage the way the update path writes it', () => {
    expect(serializeEstateSpecsForCreate({ suburbPlaceId: 'x' })).toBe('{"suburbPlaceId":"x"}');
    expect(serializeEstateSpecsForCreate('{"a":1}')).toBe('{"a":1}');
    expect(serializeEstateSpecsForCreate(undefined)).toBeNull();
    expect(serializeEstateSpecsForCreate('')).toBeNull();
  });
});
