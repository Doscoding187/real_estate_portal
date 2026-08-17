import { describe, expect, it, vi } from 'vitest';
import { buildCanonicalCorePropertyDetails } from '../../../shared/core-property-information';
import { normalizeFeaturesContext } from '../../../shared/features-context';
import { buildPricingContract } from '../../../shared/pricing-contract';
import {
  resolveApprovedPublicProperty,
  type ApprovedPublicPropertyDataSource,
} from '../approvedPublicPropertyService';

const APPROVED_AT = '2026-08-10 10:00:00';
const PHOTO_URL = 'https://cdn.example.test/approved-photo.jpg';

function approvedDetails(bathrooms = 2) {
  const details = {
    corePropertyInformation: {
      version: 1,
      bedrooms: { status: 'known', value: 3 },
      bathrooms: { status: 'known', value: bathrooms },
      parkingBays: { status: 'known', value: 2 },
      garages: { status: 'known', value: 1 },
      internalArea: { status: 'known', valueM2: 180 },
      erfArea: { status: 'known', valueM2: 420 },
    },
    featuresContext: {
      version: 1,
      spaces: ['garden'],
      security: { features: ['electric_fence'] },
      utilities: {},
      highlights: ['north_facing'],
      petPolicy: 'allowed',
    },
    propertyHighlights: ['North-facing garden'],
    propertyPresentation: {
      media: [
        { mediaId: 'existing:12', kind: 'floorplan', label: 'Ground floor' },
        { mediaId: 'existing:14', kind: 'document', label: 'Public brochure' },
      ],
      virtualTour: {
        provider: 'matterport',
        sourceUrl: 'https://my.matterport.com/show/?m=approvedModel',
        displayLabel: 'Approved 3D tour',
      },
    },
  };
  const pricing = { askingPrice: 2_500_000, negotiable: false };
  const canonical = {
    ...details,
    featuresContext: normalizeFeaturesContext(details.featuresContext, details),
    ...buildCanonicalCorePropertyDetails('house', details),
  } as Record<string, unknown>;
  const pricingContract = buildPricingContract('sell', pricing, canonical);
  if (pricingContract) canonical.pricingContract = pricingContract;
  return { details, canonical, pricing };
}

function canonicalFixture(bathrooms = 2) {
  const { details, canonical, pricing } = approvedDetails(bathrooms);
  const property = {
    id: 501,
    title: 'Approved Sandton Home',
    description: 'The last approved public description.',
    propertyType: 'house',
    listingType: 'sale',
    transactionType: 'sale',
    price: 2_500_000,
    bedrooms: 3,
    bathrooms,
    area: 180,
    internalAreaM2: 180,
    erfSizeM2: 420,
    address: 'Sandton, Johannesburg',
    publicAddress: 'Sandton, Johannesburg',
    city: 'Johannesburg',
    province: 'Gauteng',
    status: 'available',
    sourceListingId: 9001,
    ownerId: 100,
    agentId: 33,
    propertySettings: JSON.stringify(canonical),
    mainImage: PHOTO_URL,
    videoUrl: 'https://cdn.example.test/stale-projection-video.mp4',
    placeId: 'private-provider-identity',
  };
  const sourceListing = {
    id: 9001,
    revisionOfListingId: null,
    status: 'published',
    approvalStatus: 'approved',
    action: 'sell',
    propertyType: 'house',
    title: property.title,
    description: property.description,
    propertyDetails: details,
    pricing,
    updatedAt: APPROVED_AT,
  };
  const propertyImages = [
    {
      id: 301,
      propertyId: property.id,
      imageUrl: PHOTO_URL,
      isPrimary: 1,
      displayOrder: 0,
    },
  ];
  const listingMedia = [
    {
      id: 11,
      listingId: sourceListing.id,
      mediaType: 'image',
      originalUrl: PHOTO_URL,
      mimeType: 'image/jpeg',
      displayOrder: 0,
      isPrimary: 1,
      processingStatus: 'completed',
      createdAt: '2026-08-09 09:00:00',
      uploadedAt: '2026-08-09 09:00:00',
      processedAt: '2026-08-09 09:01:00',
    },
    {
      id: 12,
      listingId: sourceListing.id,
      mediaType: 'floorplan',
      originalUrl: 'https://cdn.example.test/ground-floor.png',
      mimeType: 'image/png',
      displayOrder: 1,
      isPrimary: 0,
      processingStatus: 'completed',
      createdAt: '2026-08-09 09:00:00',
      uploadedAt: '2026-08-09 09:00:00',
    },
    {
      id: 13,
      listingId: sourceListing.id,
      mediaType: 'video',
      originalUrl: 'https://cdn.example.test/walkthrough.mp4',
      mimeType: 'video/mp4',
      displayOrder: 2,
      isPrimary: 0,
      processingStatus: 'completed',
      createdAt: '2026-08-09 09:00:00',
      uploadedAt: '2026-08-09 09:00:00',
    },
    {
      id: 14,
      listingId: sourceListing.id,
      mediaType: 'pdf',
      originalUrl: 'https://cdn.example.test/public-brochure.pdf',
      mimeType: 'application/pdf',
      displayOrder: 3,
      isPrimary: 0,
      processingStatus: 'completed',
      createdAt: '2026-08-09 09:00:00',
      uploadedAt: '2026-08-09 09:00:00',
    },
  ];

  return { property, sourceListing, propertyImages, listingMedia };
}

function dataSource(
  fixture = canonicalFixture(),
): ApprovedPublicPropertyDataSource & Record<string, ReturnType<typeof vi.fn>> {
  return {
    getPropertyById: vi.fn().mockResolvedValue(fixture.property),
    getPropertyImages: vi.fn().mockResolvedValue(fixture.propertyImages),
    getListingById: vi.fn().mockResolvedValue(fixture.sourceListing),
    getListingMedia: vi.fn().mockResolvedValue(fixture.listingMedia),
  } as any;
}

describe('ApprovedPublicProperty authority', () => {
  it('resolves one stable public identity from the coherent approved source aggregate', async () => {
    const source = dataSource();

    const result = await resolveApprovedPublicProperty(501, source);

    expect(result?.authority).toBe('approved_listing');
    expect(result?.sourceListingId).toBe(9001);
    expect(result?.property).toMatchObject({
      id: 501,
      title: 'Approved Sandton Home',
      price: 2_500_000,
      bedrooms: 3,
      bathrooms: 2,
      sourceType: 'approved_listing_projection',
    });
    expect(result?.property).not.toHaveProperty('sourceListingId');
    expect(result?.property).not.toHaveProperty('sourceListing');
    expect(source.getListingById).toHaveBeenCalledWith(9001);
  });

  it('preserves typed approved presentation without flattening non-images into photos', async () => {
    const result = await resolveApprovedPublicProperty(501, dataSource());

    expect(result?.images.map(item => item.mediaType)).toEqual(['image']);
    expect(result?.media.map(item => item.mediaType)).toEqual([
      'image',
      'floorplan',
      'video',
      'pdf',
    ]);
    expect(result?.media.find(item => item.mediaType === 'floorplan')).toMatchObject({
      presentationKind: 'floorplan',
      presentationLabel: 'Ground floor',
    });
    expect(result?.media.find(item => item.mediaType === 'pdf')).toMatchObject({
      presentationKind: 'document',
      presentationLabel: 'Public brochure',
    });
    expect(result?.property.virtualTour).toMatchObject({
      provider: 'matterport',
      displayLabel: 'Approved 3D tour',
      status: 'active',
    });
    expect(result?.property.mainImage).toBe(PHOTO_URL);
    expect(result?.property.videoUrl).toBe('https://cdn.example.test/walkthrough.mp4');
    expect(result?.property.placeId).toBeNull();
  });

  it('exposes exact approved address and coordinates only from the public projection', async () => {
    const fixture = canonicalFixture();
    Object.assign(fixture.property, {
      address: 'PRIVATE LEGACY ADDRESS',
      publicAddress: '12 Katherine Street, Sandton, Johannesburg',
      publicLatitude: '-26.1076000',
      publicLongitude: '28.0567000',
      publicLocationPrecision: 'exact',
      zipCode: '2196',
      privateAddress: {
        streetNumber: '12',
        streetName: 'Katherine Street',
        unitNumber: 'Unit 4',
      },
      coordinateSource: 'map',
      locationConfirmationState: 'confirmed',
    });

    const result = await resolveApprovedPublicProperty(501, dataSource(fixture));

    expect(result?.property).toMatchObject({
      address: '12 Katherine Street, Sandton, Johannesburg',
      publicAddress: '12 Katherine Street, Sandton, Johannesburg',
      latitude: -26.1076,
      longitude: 28.0567,
      publicLatitude: -26.1076,
      publicLongitude: 28.0567,
      publicLocationPrecision: 'exact',
      zipCode: '2196',
      placeId: null,
    });
    expect(result?.property).not.toHaveProperty('privateAddress');
    expect(result?.property).not.toHaveProperty('coordinateSource');
    expect(JSON.stringify(result?.property)).not.toContain('Unit 4');
    expect(JSON.stringify(result?.property)).not.toContain('PRIVATE LEGACY ADDRESS');
  });

  it('uses approximate public location without exposing exact address evidence', async () => {
    const fixture = canonicalFixture();
    Object.assign(fixture.property, {
      address: 'PRIVATE LEGACY ADDRESS',
      publicAddress: 'Katherine Street, Sandton, Johannesburg',
      latitude: '-26.1076000',
      longitude: '28.0567000',
      publicLatitude: '-26.1100000',
      publicLongitude: '28.0500000',
      publicLocationPrecision: 'approximate',
      zipCode: '2196',
      privateAddress: {
        streetNumber: '12',
        streetName: 'Katherine Street',
        unitNumber: 'Unit 4',
      },
      placeId: 'private-provider-identity',
    });

    const result = await resolveApprovedPublicProperty(501, dataSource(fixture));

    expect(result?.property).toMatchObject({
      address: 'Katherine Street, Sandton, Johannesburg',
      publicAddress: 'Katherine Street, Sandton, Johannesburg',
      latitude: -26.11,
      longitude: 28.05,
      publicLocationPrecision: 'approximate',
      placeId: null,
    });
    expect(result?.property.zipCode).toBeUndefined();
    expect(result?.property).not.toHaveProperty('privateAddress');
    expect(JSON.stringify(result?.property)).not.toContain('Unit 4');
    expect(JSON.stringify(result?.property)).not.toContain('private-provider-identity');
    expect(JSON.stringify(result?.property)).not.toContain('PRIVATE LEGACY ADDRESS');
  });

  it.each([
    ['missing', null, null],
    ['partial', '-26.1076000', null],
    ['zero', 0, 0],
  ])('does not publish an invalid %s coordinate pair', async (_label, latitude, longitude) => {
    const fixture = canonicalFixture();
    Object.assign(fixture.property, {
      publicAddress: 'Katherine Street, Sandton, Johannesburg',
      publicLatitude: latitude,
      publicLongitude: longitude,
      publicLocationPrecision: 'exact',
    });

    const result = await resolveApprovedPublicProperty(501, dataSource(fixture));

    expect(result?.property.latitude).toBeNull();
    expect(result?.property.longitude).toBeNull();
    expect(result?.property.publicLatitude).toBeNull();
    expect(result?.property.publicLongitude).toBeNull();
  });

  it('accepts the exact source-details projection shape written by revision approval', async () => {
    const fixture = canonicalFixture();
    const canonicalSettings = JSON.parse(String(fixture.property.propertySettings));
    fixture.sourceListing.propertyDetails = {
      ...fixture.sourceListing.propertyDetails,
      pricingContract: canonicalSettings.pricingContract,
    };
    fixture.property.propertySettings = JSON.stringify(fixture.sourceListing.propertyDetails);

    const result = await resolveApprovedPublicProperty(501, dataSource(fixture));

    expect(result?.authority).toBe('approved_listing');
    expect(result?.property).toMatchObject({ id: 501, bedrooms: 3, bathrooms: 2 });
  });

  it('preserves a fractional approved bathroom fact in Detail despite a lossy scalar projection', async () => {
    const fixture = canonicalFixture(2.5);
    fixture.property.bathrooms = 3;

    const result = await resolveApprovedPublicProperty(501, dataSource(fixture));

    expect(result?.property).toMatchObject({ id: 501, bedrooms: 3, bathrooms: 2.5 });
  });

  it('never asks for or exposes an isolated pending revision candidate', async () => {
    const fixture = canonicalFixture();
    const pendingRevision = {
      id: 9002,
      revisionOfListingId: 9001,
      status: 'pending_review',
      title: 'PRIVATE REVISION TITLE',
      propertyDetails: { bedrooms: 99 },
    };
    const source = dataSource(fixture);
    source.getListingById.mockImplementation(async (id: number) => {
      if (id === pendingRevision.id) throw new Error('Pending revision was read publicly');
      return fixture.sourceListing;
    });

    const result = await resolveApprovedPublicProperty(501, source);

    expect(result?.property.title).toBe('Approved Sandton Home');
    expect(result?.property.bedrooms).toBe(3);
    expect(JSON.stringify(result)).not.toContain('PRIVATE REVISION');
    expect(source.getListingById).toHaveBeenCalledTimes(1);
    expect(source.getListingById).toHaveBeenCalledWith(9001);
  });

  it('fails closed instead of falling back to a projection when the bridge lifecycle is invalid', async () => {
    const fixture = canonicalFixture();
    fixture.sourceListing.approvalStatus = 'pending';
    const source = dataSource(fixture);

    await expect(resolveApprovedPublicProperty(501, source)).resolves.toBeNull();

    expect(source.getListingMedia).not.toHaveBeenCalled();
  });

  it('fails closed when partially promoted source images disagree with the approved mirror', async () => {
    const fixture = canonicalFixture();
    fixture.listingMedia[0].originalUrl = 'https://cdn.example.test/unapproved-new-photo.jpg';

    await expect(resolveApprovedPublicProperty(501, dataSource(fixture))).resolves.toBeNull();
  });

  it('fails closed when partially promoted source facts disagree with the approved projection', async () => {
    const fixture = canonicalFixture();
    fixture.sourceListing.propertyDetails = {
      ...fixture.sourceListing.propertyDetails,
      corePropertyInformation: {
        ...fixture.sourceListing.propertyDetails.corePropertyInformation,
        bedrooms: { status: 'known', value: 9 },
      },
    };

    await expect(resolveApprovedPublicProperty(501, dataSource(fixture))).resolves.toBeNull();
  });

  it('fails closed when newly promoted typed media is newer than the approved source version', async () => {
    const fixture = canonicalFixture();
    fixture.listingMedia[2].originalUrl = 'https://cdn.example.test/unapproved-video.mp4';
    fixture.listingMedia[2].createdAt = '2026-08-11 09:00:00';
    fixture.listingMedia[2].uploadedAt = '2026-08-11 09:00:00';

    await expect(resolveApprovedPublicProperty(501, dataSource(fixture))).resolves.toBeNull();
  });

  it('fails closed for unlinked legacy inventory until it is migrated or quarantined', async () => {
    const source = dataSource();
    source.getPropertyById.mockResolvedValue({
      id: 77,
      sourceListingId: null,
      status: 'available',
      title: 'Legacy projected home',
      description: 'Projection-owned legacy description.',
      propertyType: 'house',
      listingType: 'sale',
      price: 900_000,
      area: 90,
      address: 'PRIVATE LEGACY ADDRESS',
      placeId: 'legacy-provider-identity',
      privateAddress: { streetNumber: '99', unitNumber: 'Private Unit' },
      zipCode: '0001',
      city: 'Pretoria',
      province: 'Gauteng',
      propertySettings: '{}',
      mainImage: 'https://cdn.example.test/legacy.jpg',
      virtualTourUrl: 'https://attacker.example.test/embed',
    });
    source.getPropertyImages.mockResolvedValue([]);

    const result = await resolveApprovedPublicProperty(77, source);

    expect(result).toBeNull();
    expect(source.getListingById).not.toHaveBeenCalled();
    expect(source.getListingMedia).not.toHaveBeenCalled();
  });
});
