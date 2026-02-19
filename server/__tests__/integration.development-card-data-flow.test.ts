import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

const { mockSearchProperties } = vi.hoisted(() => ({
  mockSearchProperties: vi.fn(),
}));

vi.mock('../services/propertySearchService', () => ({
  propertySearchService: {
    searchProperties: mockSearchProperties,
  },
}));

import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import { developers, developments } from '../../drizzle/schema';
import { developmentService } from '../services/developmentService';

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDb('Development Card Data Flow Integration', () => {
  let createdDevelopmentId: number | null = null;
  let createdDeveloperId: number | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    mockSearchProperties.mockResolvedValue({
      properties: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdDevelopmentId) {
      await db.delete(developments).where(eq(developments.id, createdDevelopmentId));
      createdDevelopmentId = null;
    }

    if (createdDeveloperId) {
      await db.delete(developers).where(eq(developers.id, createdDeveloperId));
      createdDeveloperId = null;
    }
  });

  it('keeps wizard-origin development fields intact through properties.search includeDevelopments', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const testUserId = 1700000000 + Math.floor(Math.random() * 1000000);
    const builderName = `Card Flow Builder ${suffix}`;
    const developmentName = `Card Flow Development ${suffix}`;
    const description =
      'This description is created in the wizard flow and should be shown exactly on result cards.';
    const highlights = ['24-Hour Security', 'Prime Location', 'Lifestyle Amenities'];

    const insertResult = await db!.insert(developers).values({
      userId: testUserId,
      name: builderName,
      email: `card-flow-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    createdDeveloperId = Number(insertResult[0].insertId);

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: developmentName,
      developmentType: 'residential',
      transactionType: 'for_sale',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Berea',
      status: 'selling',
      description,
      highlights,
      images: [{ url: 'https://placehold.co/600x400/e2e8f0/64748b?text=Card+Flow' }],
      unitTypes: [
        {
          name: '2 Bed Apartment',
          bedrooms: 2,
          bathrooms: 2,
          unitSize: 70,
          yardSize: 0,
          priceFrom: 1200000,
          totalUnits: 10,
          availableUnits: 10,
          parkingType: 'none',
          parkingBays: 0,
          description: 'Card-flow test unit type',
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await developmentService.publishDevelopment(createdDevelopmentId, testUserId);
    await developmentService.approveDevelopment(createdDevelopmentId, 1);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: null,
    } as any);

    const result = await caller.properties.search({
      city: 'Johannesburg',
      province: 'Gauteng',
      limit: 20,
      offset: 0,
      includeDevelopments: true,
    });

    const developmentItems = (result as any)?.developments?.items ?? [];
    const matched = developmentItems.find((dev: any) => Number(dev.id) === createdDevelopmentId);

    expect(matched).toBeTruthy();
    expect(matched).toMatchObject({
      id: createdDevelopmentId,
      name: developmentName,
      city: 'Johannesburg',
      suburb: 'Berea',
      province: 'Gauteng',
      status: 'selling',
      isFeatured: false,
      description,
      highlights,
      builderName,
    });

    expect(Array.isArray(matched.images)).toBe(true);
    expect(matched.images.length).toBeGreaterThan(0);
    expect(Array.isArray(matched.configurations)).toBe(true);
    expect(matched.configurations.length).toBeGreaterThan(0);
    expect(matched.configurations[0]).toMatchObject({
      label: '2 Bed Apartment',
      priceFrom: 1200000,
    });
  });

  it('blocks publishing when description is empty', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const testUserId = 1800000000 + Math.floor(Math.random() * 1000000);

    const insertResult = await db!.insert(developers).values({
      userId: testUserId,
      name: `No Description Builder ${suffix}`,
      email: `no-description-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    createdDeveloperId = Number(insertResult[0].insertId);

    const createdDevelopment = await developmentService.createDevelopment(testUserId, {
      name: `No Description Development ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_sale',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Berea',
      status: 'selling',
      images: [{ url: 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Description' }],
      unitTypes: [
        {
          name: '1 Bed Apartment',
          bedrooms: 1,
          bathrooms: 1,
          unitSize: 55,
          yardSize: 0,
          priceFrom: 850000,
          totalUnits: 8,
          availableUnits: 8,
          parkingType: 'none',
          parkingBays: 0,
        },
      ],
    } as any);

    createdDevelopmentId = Number(createdDevelopment.id);

    await expect(
      developmentService.publishDevelopment(createdDevelopmentId, testUserId),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Description is required before publishing',
    });

    const [stillDraft] = await db!
      .select({ isPublished: developments.isPublished })
      .from(developments)
      .where(eq(developments.id, createdDevelopmentId))
      .limit(1);

    expect(Number(stillDraft?.isPublished ?? 0)).toBe(0);
  });
});
