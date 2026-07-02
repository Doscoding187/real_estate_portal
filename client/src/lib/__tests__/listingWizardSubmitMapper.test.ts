import { describe, expect, it } from 'vitest';
import { buildListingWizardSubmitPayload } from '@/lib/listingWizardSubmitMapper';

const baseWizardState = {
  action: 'sell',
  propertyType: 'house',
  title: 'Modern family home in a secure estate',
  description:
    'A detailed listing description that is long enough for the wizard contract and preview flow.',
  pricing: {
    askingPrice: 3250000,
    ratesAndTaxes: 1850,
  },
  location: {
    address: '1 Main Road',
    latitude: -26.1076,
    longitude: 28.0567,
    city: 'Johannesburg',
    suburb: 'Sandton',
    province: 'Gauteng',
  },
  media: [
    { id: 'uploads/listing/front.jpg' },
    { id: 'uploads/listing/kitchen.jpg' },
  ],
  mainMediaId: 'uploads/listing/kitchen.jpg',
};

describe('buildListingWizardSubmitPayload', () => {
  it('keeps Step 3 basicInfo and physical specs in submitted propertyDetails', () => {
    const payload = buildListingWizardSubmitPayload({
      ...baseWizardState,
      basicInfo: {
        stockType: 'existing',
        propertyCategory: 'existing',
        developmentAssociation: 'no_link',
        listingStatus: 'ready_to_move',
        possessionStatus: 'owner_occupied',
      },
      propertyDetails: {
        bedrooms: 4,
        bathrooms: 2.5,
        houseAreaM2: 240,
        erfSizeM2: 600,
        parkingCount: 2,
      },
      additionalInfo: {},
    });

    expect(payload.title).toBe(baseWizardState.title);
    expect(payload.description).toBe(baseWizardState.description);
    expect(payload.propertyDetails).toMatchObject({
      stockType: 'existing',
      propertyCategory: 'existing',
      developmentAssociation: 'no_link',
      listingStatus: 'ready_to_move',
      possessionStatus: 'owner_occupied',
      bedrooms: 4,
      bathrooms: 2.5,
      houseAreaM2: 240,
      erfSizeM2: 600,
      parkingCount: 2,
      parkingBays: 2,
    });
  });

  it('preserves New Build + No Link context without inventing development fields', () => {
    const payload = buildListingWizardSubmitPayload({
      ...baseWizardState,
      basicInfo: {
        stockType: 'new_build',
        propertyCategory: 'new_development',
        developmentAssociation: 'no_link',
        developerName: 'Northpoint Builders',
      },
      propertyDetails: {
        bedrooms: 3,
        bathrooms: 2,
        parkingCount: 1,
      },
      additionalInfo: {},
    });

    expect(payload.propertyDetails).toMatchObject({
      stockType: 'new_build',
      propertyCategory: 'new_development',
      developmentAssociation: 'no_link',
      developerName: 'Northpoint Builders',
    });
    expect(payload.propertyDetails).not.toHaveProperty('developmentName');
    expect(payload.propertyDetails).not.toHaveProperty('unitTypeName');
  });

  it('preserves existing stock linked to a development or estate', () => {
    const payload = buildListingWizardSubmitPayload({
      ...baseWizardState,
      basicInfo: {
        stockType: 'existing',
        propertyCategory: 'existing',
        developmentAssociation: 'link_existing',
        selectedDevelopmentId: 42,
        developmentName: 'The Ridge Estate',
        unitTypeName: 'Type B Duplex',
      },
      propertyDetails: {
        bedrooms: 3,
        bathrooms: 2,
        parkingCount: 2,
      },
      additionalInfo: {},
    });

    expect(payload.propertyDetails).toMatchObject({
      stockType: 'existing',
      propertyCategory: 'existing',
      developmentAssociation: 'link_existing',
      selectedDevelopmentId: 42,
      developmentName: 'The Ridge Estate',
      unitTypeName: 'Type B Duplex',
    });
  });

  it('keeps Step 4 semantic buckets separate and mirrors lifestyleHighlights for compatibility', () => {
    const payload = buildListingWizardSubmitPayload({
      ...baseWizardState,
      basicInfo: {},
      propertyDetails: {
        bedrooms: 4,
        parkingCount: 2,
      },
      additionalInfo: {
        additionalRooms: ['Study / Office'],
        outdoorFeatures: ['pool', 'garden'],
        appliancesIncluded: ['oven', 'hob'],
        lifestyleHighlights: ['Modern Finishes', 'Natural Light'],
        viewHighlights: ['sea_view'],
        locationHighlights: ['near_top_schools'],
        accessibilityFeatures: ['step_free_access'],
        securityFeatures: ['electric_fence'],
        amenitiesFeatures: ['Gym'],
      },
    });

    expect(payload.propertyDetails.additionalRooms).toEqual(['Study / Office']);
    expect(payload.propertyDetails.outdoorFeatures).toEqual(['pool', 'garden']);
    expect(payload.propertyDetails.appliancesIncluded).toEqual(['oven', 'hob']);
    expect(payload.propertyDetails.lifestyleHighlights).toEqual([
      'Modern Finishes',
      'Natural Light',
    ]);
    expect(payload.propertyDetails.propertyHighlights).toEqual([
      'Modern Finishes',
      'Natural Light',
    ]);
    expect(payload.propertyDetails.viewHighlights).toEqual(['sea_view']);
    expect(payload.propertyDetails.locationHighlights).toEqual(['near_top_schools']);
    expect(payload.propertyDetails.accessibilityFeatures).toEqual(['step_free_access']);
    expect(payload.propertyDetails.securityFeatures).toEqual(['electric_fence']);
    expect(payload.propertyDetails.amenitiesFeatures).toEqual(['Gym']);
  });

  it('does not introduce a generic features bucket or reclassify analytics views', () => {
    const payload = buildListingWizardSubmitPayload({
      ...baseWizardState,
      basicInfo: {},
      propertyDetails: {
        bedrooms: 2,
        views: 128,
      },
      additionalInfo: {
        lifestyleHighlights: ['Move-in Ready'],
        viewHighlights: ['mountain_view'],
        locationHighlights: ['near_public_transport'],
        additionalRooms: ['Laundry Room'],
      },
    });

    expect(payload.propertyDetails).not.toHaveProperty('features');
    expect(payload.propertyDetails.views).toBe(128);
    expect(payload.propertyDetails.viewHighlights).toEqual(['mountain_view']);
    expect(payload.propertyDetails.locationHighlights).toEqual(['near_public_transport']);
    expect(payload.propertyDetails.additionalRooms).toEqual(['Laundry Room']);
    expect(payload.propertyDetails.additionalRooms).not.toContain('Move-in Ready');
    expect(payload.propertyDetails.additionalRooms).not.toContain('mountain_view');
    expect(payload.propertyDetails.additionalRooms).not.toContain('near_public_transport');
  });

  it('preserves backend media payload shape', () => {
    const payload = buildListingWizardSubmitPayload({
      ...baseWizardState,
      basicInfo: {},
      propertyDetails: {},
      additionalInfo: {},
    });

    expect(payload.mediaIds).toEqual(['uploads/listing/front.jpg', 'uploads/listing/kitchen.jpg']);
    expect(payload.mainMediaId).toBe('uploads/listing/kitchen.jpg');
  });
});
