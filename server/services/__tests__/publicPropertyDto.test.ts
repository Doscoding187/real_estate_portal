import { describe, expect, it } from 'vitest';

import { toPublicPropertyDetailDto } from '../publicPropertyDto';

describe('publicPropertyDto', () => {
  it('publishes buyer facts and explicit identity without source, owner or custody evidence', () => {
    const result = toPublicPropertyDetailDto({
      authority: 'approved_listing',
      publicAuthority: 'public_property_eligibility',
      sourceListingId: 9001,
      custody: {
        leadCustody: 'verified_customer_recipient',
        recipientType: 'agent',
        recipientId: 33,
        agentId: 33,
        agencyId: 44,
        route: 'direct',
        supplyOrigin: 'customer_managed',
      },
      publicIdentity: {
        role: 'agent',
        provenance: 'agent',
        name: 'Jane Agent',
        organizationName: 'Canonical Realty',
        agentId: 33,
        agencyId: 44,
      },
      property: {
        id: 501,
        title: 'Approved home',
        description: 'Buyer-safe description',
        price: 2_500_000,
        listingType: 'sale',
        propertyType: 'house',
        city: 'Johannesburg',
        ownerId: 100,
        agentId: 33,
        sourceListingId: 9001,
        cataloguePublisherId: 55,
        status: 'published',
        views: 99,
        enquiries: 12,
        developerBrand: {
          id: 8,
          brandName: 'Public Developer',
          logoUrl: 'https://cdn.example.com/logo.png',
          internalNotes: 'do not publish',
          ownerId: 404,
        },
        propertyDetails: {
          bedrooms: 3,
          privateAddress: { unitNumber: '4' },
          ownerId: 100,
          leadCustody: 'verified_customer_recipient',
          internalWorkflowNote: 'Contact owner before publishing',
          corePropertyInformation: {
            version: 1,
            bedrooms: { status: 'known', value: 3, internalWorkflowNote: 'not public' },
            bathrooms: { status: 'known', value: 2 },
            internalWorkflowNote: 'not public',
          },
          featuresContext: {
            version: 1,
            spaces: ['garden'],
            context: { setting: 'estate', internalWorkflowNote: 'not public' },
            utilities: { electricitySupply: 'municipal', internalWorkflowNote: 'not public' },
            security: { status: 'known', features: ['access_control'], alarmCode: '1234' },
            highlights: ['natural_light'],
            customFeatures: ['Fireplace'],
            customHighlights: ['North-facing garden'],
            internalWorkflowNote: 'not public',
          },
          pricingContract: {
            version: 1,
            intent: 'sale',
            askingPrice: 2_500_000,
            negotiability: 'negotiable',
            recurringCosts: {
              ratesAndTaxes: {
                status: 'known',
                amount: 1_750,
                cadence: 'monthly',
                internalWorkflowNote: 'not public',
              },
              internalReserve: { status: 'known', amount: 900 },
            },
            internalWorkflowNote: 'not public',
          },
        },
      },
      images: [
        {
          id: 1,
          propertyId: 501,
          imageUrl: 'https://cdn.example.com/home.jpg',
          originalUrl: 'private/source/key.jpg',
          isPrimary: 1,
          displayOrder: 0,
        },
      ],
      media: [
        {
          id: 1,
          listingId: 9001,
          url: 'https://cdn.example.com/home.jpg',
          originalUrl: 'private/source/key.jpg',
          processingStatus: 'completed',
          mediaType: 'image',
          isPrimary: 1,
          displayOrder: 0,
        },
      ],
    } as Parameters<typeof toPublicPropertyDetailDto>[0]);

    expect(result.property).toMatchObject({
      id: 501,
      title: 'Approved home',
      propertyDetails: {
        bedrooms: 3,
        bathrooms: 2,
        corePropertyInformation: {
          version: 1,
          bedrooms: { status: 'known', value: 3 },
          bathrooms: { status: 'known', value: 2 },
        },
        featuresContext: {
          version: 1,
          spaces: ['garden'],
          context: { setting: 'estate' },
          utilities: { electricitySupply: 'municipal' },
          security: { status: 'known', features: ['access_control'] },
          highlights: ['natural_light'],
          customFeatures: ['Fireplace'],
          customHighlights: ['North-facing garden'],
        },
        pricingContract: {
          version: 1,
          intent: 'sale',
          askingPrice: 2_500_000,
          negotiability: 'negotiable',
          recurringCosts: {
            ratesAndTaxes: {
              status: 'known',
              amount: 1_750,
              cadence: 'monthly',
              provenance: 'advertiser',
            },
          },
        },
      },
      pricingContract: {
        version: 1,
        intent: 'sale',
        askingPrice: 2_500_000,
        negotiability: 'negotiable',
      },
      publicIdentity: {
        role: 'agent',
        agentId: 33,
        agencyId: 44,
      },
      developerBrand: {
        id: 8,
        brandName: 'Public Developer',
        logoUrl: 'https://cdn.example.com/logo.png',
      },
    });
    expect(result.images[0]).toEqual({
      id: 1,
      imageUrl: 'https://cdn.example.com/home.jpg',
      url: 'https://cdn.example.com/home.jpg',
      isPrimary: 1,
      displayOrder: 0,
      mediaType: 'image',
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('sourceListingId');
    expect(serialized).not.toContain('ownerId');
    expect(serialized).not.toContain('leadCustody');
    expect(serialized).not.toContain('recipientId');
    expect(serialized).not.toContain('privateAddress');
    expect(serialized).not.toContain('originalUrl');
    expect(serialized).not.toContain('processingStatus');
    expect(serialized).not.toContain('internalNotes');
    expect(serialized).not.toContain('internalWorkflowNote');
    expect(serialized).not.toContain('alarmCode');
    expect(serialized).not.toContain('internalReserve');
    expect(serialized).not.toContain('"views"');
    expect(serialized).not.toContain('"enquiries"');
  });
});
