import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { getDb } from '../db-connection';
import { propertySearchService } from '../services/propertySearchService';
import { agencies, agents, listingMedia, listings, properties, propertyImages, users } from '../../drizzle/schema';

describe('Property Card Data Flow Integration', () => {
  let createdUserId: number | null = null;
  let createdAgencyId: number | null = null;
  let createdAgentId: number | null = null;
  let createdListingId: number | null = null;
  let createdPropertyId: number | null = null;
  let skipTests = false;

  const getInsertId = (insertResult: unknown): number => {
    const candidate = Array.isArray(insertResult) ? insertResult[0] : insertResult;
    if (candidate && typeof candidate === 'object' && 'insertId' in candidate) {
      return Number((candidate as { insertId: number }).insertId);
    }
    throw new Error('Unable to read insertId from insert result');
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    // TODO(test-infra): Keep this integration test in CI only when DATABASE_URL=listify_test is present.
    skipTests = !process.env.DATABASE_URL;
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdPropertyId) {
      await db.delete(propertyImages).where(eq(propertyImages.propertyId, createdPropertyId));
      await db.delete(properties).where(eq(properties.id, createdPropertyId));
      createdPropertyId = null;
    }

    if (createdListingId) {
      await db.delete(listingMedia).where(eq(listingMedia.listingId, createdListingId));
      await db.delete(listings).where(eq(listings.id, createdListingId));
      createdListingId = null;
    }

    if (createdAgentId) {
      await db.delete(agents).where(eq(agents.id, createdAgentId));
      createdAgentId = null;
    }

    if (createdAgencyId) {
      await db.delete(agencies).where(eq(agencies.id, createdAgencyId));
      createdAgencyId = null;
    }

    if (createdUserId) {
      await db.delete(users).where(eq(users.id, createdUserId));
      createdUserId = null;
    }
  });

  it('returns wizard-origin description, highlights, sizes, image and agent info', async () => {
    if (skipTests) return;

    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const email = `property-card-${suffix}@example.com`;
    const propertyDescription =
      'This property description is entered in the listing wizard and must appear unchanged on result cards.';
    const profileImage = `https://cdn.example.com/agents/jane-${suffix}.jpg`;
    const listingImage = `https://cdn.example.com/properties/wizard-property-${suffix}.jpg`;

    const userInsert = await db!.insert(users).values({
      email,
      name: 'Wizard Owner',
      role: 'agent',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const agencyInsert = await db!.insert(agencies).values({
      name: `Wizard Realty ${suffix}`,
      slug: `wizard-realty-${suffix}`,
      isVerified: 1,
    });
    createdAgencyId = getInsertId(agencyInsert);

    const agentInsert = await db!.insert(agents).values({
      userId: createdUserId,
      agencyId: createdAgencyId,
      firstName: 'Jane',
      lastName: 'Agent',
      displayName: 'Jane Agent',
      profileImage,
      phone: '+27110001111',
      email,
      whatsapp: '+27110001111',
      isVerified: 1,
      isFeatured: 0,
      status: 'approved',
    });
    createdAgentId = getInsertId(agentInsert);

    const propertyInsert = await db!.insert(properties).values({
      title: `Wizard Property ${suffix}`,
      description: propertyDescription,
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      price: 2450000,
      bedrooms: 4,
      bathrooms: 2,
      area: 180,
      address: '123 Wizard Street',
      city: 'Johannesburg',
      suburb: 'Sandton',
      province: 'Gauteng',
      latitude: '-26.1076',
      longitude: '28.0567',
      amenities: 'Pool,Clubhouse',
      status: 'available',
      featured: 0,
      views: 0,
      enquiries: 0,
      agentId: createdAgentId,
      ownerId: createdUserId,
      propertySettings: JSON.stringify({
        propertySetting: 'freehold',
        houseAreaM2: 180,
        erfSizeM2: 420,
        bedrooms: 4,
        bathrooms: 2,
        amenitiesFeatures: ['Solar Ready', 'Fibre Ready'],
        securityFeatures: ['24hr_guard'],
        powerBackup: 'solar_system',
        petFriendly: true,
        internetAvailability: 'fibre_ready',
      }),
      mainImage: listingImage,
    });
    createdPropertyId = getInsertId(propertyInsert);

    await db!.insert(propertyImages).values({
      propertyId: createdPropertyId,
      imageUrl: listingImage,
      isPrimary: 1,
      displayOrder: 0,
    });

    const result = await propertySearchService.searchProperties(
      { city: 'Johannesburg', province: 'Gauteng' },
      'date_desc',
      1,
      20,
    );

    const matched = result.properties.find(p => Number(p.id) === createdPropertyId) as any;
    expect(matched).toBeTruthy();
    expect(matched.title).toBe(`Wizard Property ${suffix}`);
    expect(matched.description).toBe(propertyDescription);
    expect(matched.floorSize).toBe(180);
    expect(matched.erfSize).toBe(420);
    expect(matched.mainImage).toBe(listingImage);
    expect(matched.images?.[0]?.url).toBe(listingImage);
    expect(matched.highlights).toEqual(expect.arrayContaining(['Solar Ready', 'Fibre Ready']));
    expect(matched.agent?.name).toBe('Jane Agent');
    expect(matched.agent?.agency).toBe(`Wizard Realty ${suffix}`);
    expect(matched.agent?.image).toBe(profileImage);
  });

  it('falls back to source listing media when searchable property images are missing', async () => {
    if (skipTests) return;

    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const email = `property-card-fallback-${suffix}@example.com`;
    const listingImage = `https://cdn.example.com/properties/source-listing-${suffix}.jpg`;

    const userInsert = await db!.insert(users).values({
      email,
      name: 'Fallback Owner',
      role: 'agent',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const agencyInsert = await db!.insert(agencies).values({
      name: `Fallback Realty ${suffix}`,
      slug: `fallback-realty-${suffix}`,
      isVerified: 1,
    });
    createdAgencyId = getInsertId(agencyInsert);

    const agentInsert = await db!.insert(agents).values({
      userId: createdUserId,
      agencyId: createdAgencyId,
      firstName: 'John',
      lastName: 'Agent',
      displayName: 'John Agent',
      phone: '+27110002222',
      email,
      whatsapp: '+27110002222',
      isVerified: 1,
      isFeatured: 0,
      status: 'approved',
    });
    createdAgentId = getInsertId(agentInsert);

    const listingInsert = await db!.insert(listings).values({
      ownerId: createdUserId,
      agentId: createdAgentId,
      agencyId: createdAgencyId,
      action: 'sell',
      propertyType: 'house',
      title: `Fallback Listing ${suffix}`,
      description: 'Listing source media should appear on search cards.',
      askingPrice: '875000.00',
      propertyDetails: {
        bedrooms: 2,
        bathrooms: 1,
        houseAreaM2: 90,
      },
      address: '1 Source Listing Road',
      latitude: '-26.3000000',
      longitude: '28.1000000',
      city: 'Alberton',
      suburb: 'Sky City',
      province: 'Gauteng',
      slug: `fallback-listing-${suffix}`,
      status: 'published',
      approvalStatus: 'approved',
    });
    createdListingId = getInsertId(listingInsert);

    await db!.insert(listingMedia).values({
      listingId: createdListingId,
      mediaType: 'image',
      originalUrl: listingImage,
      displayOrder: 0,
      isPrimary: 1,
      processingStatus: 'completed',
    });

    const propertyInsert = await db!.insert(properties).values({
      title: `Fallback Property ${suffix}`,
      description: 'Property row is missing image sync and should fall back to listing media.',
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      price: 875000,
      bedrooms: 2,
      bathrooms: 1,
      area: 90,
      address: '1 Source Listing Road',
      city: 'Alberton',
      suburb: 'Sky City',
      province: 'Gauteng',
      latitude: '-26.3000',
      longitude: '28.1000',
      amenities: 'Security',
      status: 'available',
      featured: 0,
      views: 0,
      enquiries: 0,
      agentId: createdAgentId,
      ownerId: createdUserId,
      sourceListingId: createdListingId,
      propertySettings: JSON.stringify({
        propertySetting: 'freehold',
        houseAreaM2: 90,
        bedrooms: 2,
        bathrooms: 1,
      }),
      mainImage: null,
    });
    createdPropertyId = getInsertId(propertyInsert);

    const result = await propertySearchService.searchProperties(
      { city: 'Alberton', province: 'Gauteng', listingType: 'sale', minPrice: 989000, maxPrice: 991000 },
      'date_desc',
      1,
      20,
    );

    const matched = result.properties.find(p => Number(p.id) === createdPropertyId) as any;
    expect(matched).toBeTruthy();
    expect(matched.mainImage).toBe(listingImage);
    expect(matched.images?.[0]?.url).toBe(listingImage);
  });

  it('falls back to source listing agent identity when searchable property agent fields are missing', async () => {
    if (skipTests) return;

    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const email = `property-card-agent-fallback-${suffix}@example.com`;
    const profileImage = `https://cdn.example.com/agents/fallback-${suffix}.jpg`;

    const userInsert = await db!.insert(users).values({
      email,
      name: 'Fallback Agent Owner',
      role: 'agent',
      emailVerified: 1,
    });
    createdUserId = getInsertId(userInsert);

    const agencyInsert = await db!.insert(agencies).values({
      name: `Fallback Agent Realty ${suffix}`,
      slug: `fallback-agent-realty-${suffix}`,
      isVerified: 1,
    });
    createdAgencyId = getInsertId(agencyInsert);

    const agentInsert = await db!.insert(agents).values({
      userId: createdUserId,
      agencyId: createdAgencyId,
      firstName: 'Ava',
      lastName: 'Broker',
      displayName: 'Ava Broker',
      profileImage,
      phone: '+27110003333',
      email,
      whatsapp: '+27110003333',
      isVerified: 1,
      isFeatured: 0,
      status: 'approved',
    });
    createdAgentId = getInsertId(agentInsert);

    const listingInsert = await db!.insert(listings).values({
      ownerId: createdUserId,
      agentId: createdAgentId,
      agencyId: createdAgencyId,
      action: 'sell',
      propertyType: 'house',
      title: `Agent Identity Source ${suffix}`,
      description: 'Search cards should show the source listing agent identity.',
      askingPrice: '990000.00',
      propertyDetails: {
        bedrooms: 3,
        bathrooms: 2,
        houseAreaM2: 120,
      },
      address: '2 Identity Source Road',
      latitude: '-26.3000000',
      longitude: '28.1000000',
      city: 'Alberton',
      suburb: 'Sky City',
      province: 'Gauteng',
      slug: `agent-identity-source-${suffix}`,
      status: 'published',
      approvalStatus: 'approved',
    });
    createdListingId = getInsertId(listingInsert);

    const propertyInsert = await db!.insert(properties).values({
      title: `Agent Identity Property ${suffix}`,
      description: 'Property row is missing agent sync and should fall back to the source listing agent.',
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      price: 990000,
      bedrooms: 3,
      bathrooms: 2,
      area: 120,
      address: '2 Identity Source Road',
      city: 'Alberton',
      suburb: 'Sky City',
      province: 'Gauteng',
      latitude: '-26.3000',
      longitude: '28.1000',
      amenities: 'Security',
      status: 'available',
      featured: 0,
      views: 0,
      enquiries: 0,
      agentId: null,
      ownerId: createdUserId,
      sourceListingId: createdListingId,
      propertySettings: JSON.stringify({
        propertySetting: 'freehold',
        houseAreaM2: 120,
        bedrooms: 3,
        bathrooms: 2,
      }),
      mainImage: null,
    });
    createdPropertyId = getInsertId(propertyInsert);

    const result = await propertySearchService.searchProperties(
      { city: 'Alberton', province: 'Gauteng', listingType: 'sale', minPrice: 874000, maxPrice: 876000 },
      'date_desc',
      1,
      20,
    );

    const matched = result.properties.find(p => Number(p.id) === createdPropertyId) as any;
    expect(matched).toBeTruthy();
    expect(matched.listerType).toBe('agency');
    expect(matched.agent?.name).toBe('Ava Broker');
    expect(matched.agent?.agency).toBe(`Fallback Agent Realty ${suffix}`);
    expect(matched.agent?.image).toBe(profileImage);
  });
});
