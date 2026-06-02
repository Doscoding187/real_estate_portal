import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../db';
import { developmentService } from '../services/developmentService';
import { developments, developers, users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Mock Data
const TEST_DEV_NAME = 'Integration Test Dev Refactor';
const TEST_DEV_DATA = {
  name: TEST_DEV_NAME,
  developmentType: 'residential',
  address: '123 Test St',
  city: 'Johannesburg',
  province: 'Gauteng',
  latitude: '-26.1',
  longitude: '28.1',
  priceFrom: 1000000,
  description: 'Test Description',
  images: [{ url: 'http://example.com/image.jpg' }],
};

const V2_UNIT_DATA = [
  {
    name: 'Type A - V2',
    bedrooms: 2,
    bathrooms: 2,
    basePriceFrom: 1500000, // V2 Field
    basePriceTo: 1650000,
    unitSize: 85, // V2 Field
    parkingType: 'carport', // V2 Field
    parkingBays: 2, // V2 Field
    totalUnits: 10,
    availableUnits: 7,
    reservedUnits: 1,
    description: 'Type A original description',
    // Legacy fields omitted to test mapping
  },
  {
    name: 'Type B - Garage',
    bedrooms: 3,
    bathrooms: 2.5,
    basePriceFrom: 2500000,
    basePriceTo: 2750000,
    unitSize: 120,
    parkingType: 'garage',
    parkingBays: 2,
    totalUnits: 8,
    availableUnits: 3,
    reservedUnits: 2,
    description: 'Type B original description',
  },
];

// TODO(test-infra): Provide DATABASE_URL=listify_test in CI so this suite always runs.
const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDb('Unit Type Refactoring Integration', () => {
  let testUserId: number;
  let testDeveloperId: number;
  let createdDevId: number;
  let canonicalCreatedDevId: number | undefined;

  const getInsertId = (insertResult: unknown): number => {
    const candidate = Array.isArray(insertResult) ? insertResult[0] : insertResult;
    if (candidate && typeof candidate === 'object' && 'insertId' in candidate) {
      return Number((candidate as { insertId: number }).insertId);
    }
    throw new Error('Unable to read insertId from insert result');
  };

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('DB connection failed');

    // Create a real user/developer pair so onboarding validation passes.
    const userResult = await db.insert(users).values({
      email: `unit-type-refactor-${Date.now()}@example.com`,
      role: 'property_developer',
      firstName: 'Unit',
      lastName: 'Tester',
      name: 'Unit Type Refactor Tester',
      emailVerified: 1,
    });
    testUserId = getInsertId(userResult);

    const developerResult = await db.insert(developers).values({
      userId: testUserId,
      name: 'Unit Type Refactor Developer',
      email: `unit-type-refactor-dev-${Date.now()}@example.com`,
      category: 'residential',
      isVerified: 1,
      status: 'approved',
    });
    testDeveloperId = getInsertId(developerResult);

    // Cleanup any leftovers.
    const existing = await db
      .select()
      .from(developments)
      .where(eq(developments.name, TEST_DEV_NAME));
    for (const dev of existing) {
      await developmentService.deleteDevelopment(dev.id, -1);
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdDevId) {
      await developmentService.deleteDevelopment(createdDevId, testUserId);
    }
    if (canonicalCreatedDevId) {
      await developmentService.deleteDevelopment(canonicalCreatedDevId, testUserId);
    }

    if (testDeveloperId) {
      await db.delete(developers).where(eq(developers.id, testDeveloperId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should create from canonical developmentData and stepData unit_types', async () => {
    const dev = await developmentService.createDevelopment(testUserId, {
      workflowId: 'residential_sale',
      currentStepId: 'review_publish',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      developmentData: {
        name: 'Canonical Create Bridge',
        developmentType: 'residential',
        transactionType: 'for_sale',
        description: 'Created from the canonical wizard snapshot shape.',
        status: 'selling',
        launchDate: '2026-07-01',
        completionDate: '2027-04-30',
        location: {
          address: '42 Canonical Way',
          city: 'Cape Town',
          province: 'Western Cape',
        },
        media: {
          heroImage: { id: 'hero-canonical-create', url: 'https://example.com/canonical.jpg' },
          photos: [],
        },
      },
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: 'canonical-create-unit-1',
              name: 'Canonical Create Type',
              bedrooms: 2,
              bathrooms: 2,
              priceFrom: 1_250_000,
              priceTo: 1_350_000,
              unitSize: 78,
              parkingType: 'carport',
              parkingBays: 1,
              totalUnits: 6,
              availableUnits: 5,
              reservedUnits: 1,
            },
          ],
        },
      },
    } as any);
    canonicalCreatedDevId = dev.id;

    const fetched = await developmentService.getDevelopmentWithPhases(dev.id);

    expect(fetched.name).toBe('Canonical Create Bridge');
    expect(fetched.city).toBe('Cape Town');
    expect(fetched.province).toBe('Western Cape');
    expect(fetched.developmentData.launchDate).toContain('2026-07-01');
    expect(fetched.stepData.identity_market.launchDate).toContain('2026-07-01');
    expect(fetched.unitTypes).toHaveLength(1);
    expect(fetched.unitTypes[0]).toMatchObject({
      id: 'canonical-create-unit-1',
      name: 'Canonical Create Type',
      totalUnits: 6,
      availableUnits: 5,
      reservedUnits: 1,
    });
    expect(Number(fetched.priceFrom)).toBe(1_250_000);
    expect(Number(fetched.priceTo)).toBe(1_350_000);
  }, 30000);

  it('should persist V2 unit types correctly', async () => {
    const payload = {
      ...TEST_DEV_DATA,
      unitTypes: V2_UNIT_DATA,
    };

    // 1. Create Development
    const dev = await developmentService.createDevelopment(testUserId, payload as any);
    expect(dev).toBeDefined();
    createdDevId = dev.id;

    // 2. Fetch and Verify
    const fetched = await developmentService.getDevelopmentWithPhases(dev.id);
    const units = fetched.unitTypes;

    expect(units).toHaveLength(2);

    // Verify Type A
    const typeA = units.find(u => u.name === 'Type A - V2');
    expect(typeA).toBeDefined();
    expect(Number(typeA.basePriceFrom)).toBe(1500000);
    expect(typeA.unitSize).toBe(85);
    expect(typeA.parkingType).toBe('carport');
    expect(typeA.parkingBays).toBe(2);

    // Verify Type B (Garage)
    const typeB = units.find(u => u.name === 'Type B - Garage');
    expect(typeB).toBeDefined();
    expect(Number(typeB.basePriceFrom)).toBe(2500000);
    expect(typeB.parkingType).toBe('garage');
    expect(typeB.parkingBays).toBe(2);
  }, 30000);

  it('should preserve existing unit fields when update payload omits them', async () => {
    const fetched = await developmentService.getDevelopmentWithPhases(createdDevId);
    const typeA = fetched.unitTypes.find(u => u.name === 'Type A - V2');
    const typeB = fetched.unitTypes.find(u => u.name === 'Type B - Garage');

    expect(typeA).toBeDefined();
    expect(typeB).toBeDefined();

    await developmentService.updateDevelopment(createdDevId, testUserId, {
      unitTypes: [{ id: typeA.id, configDescription: 'Updated partial config' }, { id: typeB.id }],
    } as any);

    const updatedDev = await developmentService.getDevelopmentWithPhases(createdDevId);
    const updatedTypeA = updatedDev.unitTypes.find(u => u.id === typeA.id);
    const updatedTypeB = updatedDev.unitTypes.find(u => u.id === typeB.id);

    expect(updatedDev.unitTypes).toHaveLength(2);
    expect(updatedTypeA.name).toBe(typeA.name);
    expect(updatedTypeA.configDescription).toBe('Updated partial config');
    expect(updatedTypeA.id).toBe(typeA.id);
    expect(Number(updatedTypeA.basePriceFrom)).toBe(Number(typeA.basePriceFrom));
    expect(Number(updatedTypeA.basePriceTo)).toBe(Number(typeA.basePriceTo));
    expect(updatedTypeA.unitSize).toBe(typeA.unitSize);
    expect(updatedTypeA.parkingType).toBe(typeA.parkingType);
    expect(updatedTypeA.parkingBays).toBe(typeA.parkingBays);
    expect(updatedTypeA.description).toBe(typeA.description);
    expect(updatedTypeA.totalUnits).toBe(typeA.totalUnits);
    expect(updatedTypeA.availableUnits).toBe(typeA.availableUnits);
    expect(updatedTypeA.reservedUnits).toBe(typeA.reservedUnits);
    expect(updatedTypeA.baseMedia).toEqual({ gallery: [], floorPlans: [], renders: [] });
    expect(Object.keys(updatedTypeA.baseMedia)).not.toContain('0');

    expect(updatedTypeB.name).toBe(typeB.name);
    expect(Number(updatedTypeB.basePriceFrom)).toBe(Number(typeB.basePriceFrom));
    expect(updatedTypeB.unitSize).toBe(typeB.unitSize);
    expect(updatedTypeB.parkingType).toBe(typeB.parkingType);
  }, 30000);

  it('should preserve omitted units for legacy root-only partial unit updates', async () => {
    const fetched = await developmentService.getDevelopmentWithPhases(createdDevId);
    const typeA = fetched.unitTypes.find(u => u.name === 'Type A - V2');
    const typeB = fetched.unitTypes.find(u => u.name === 'Type B - Garage');

    expect(typeA).toBeDefined();
    expect(typeB).toBeDefined();

    await developmentService.updateDevelopment(createdDevId, testUserId, {
      unitTypes: [
        {
          id: typeA.id,
          configDescription: 'Root-only partial update',
        },
      ],
    } as any);

    const updatedDev = await developmentService.getDevelopmentWithPhases(createdDevId);
    const updatedTypeA = updatedDev.unitTypes.find(u => u.id === typeA.id);
    const preservedTypeB = updatedDev.unitTypes.find(u => u.id === typeB.id);

    expect(updatedDev.unitTypes).toHaveLength(2);
    expect(updatedTypeA).toMatchObject({
      id: typeA.id,
      name: typeA.name,
      configDescription: 'Root-only partial update',
    });
    expect(Number(updatedTypeA.basePriceFrom)).toBe(Number(typeA.basePriceFrom));
    expect(preservedTypeB).toMatchObject({
      id: typeB.id,
      name: typeB.name,
    });
    expect(Number(preservedTypeB.basePriceFrom)).toBe(Number(typeB.basePriceFrom));
  }, 30000);

  it('should handle UPSERT (Update existing unit)', async () => {
    await developmentService.updateDevelopment(createdDevId, testUserId, {
      name: 'Integration Test Dev Refactor Renamed',
    } as any);

    const renamed = await developmentService.getDevelopmentWithPhases(createdDevId);
    expect(renamed.name).toBe('Integration Test Dev Refactor Renamed');
    expect(renamed.description).toBe(TEST_DEV_DATA.description);
    expect(renamed.city).toBe(TEST_DEV_DATA.city);

    const fetched = await developmentService.getDevelopmentWithPhases(createdDevId);
    const typeA = fetched.unitTypes.find(u => u.name === 'Type A - V2');

    // Update through the canonical inventory step. The root unitTypes mirror is
    // kept for compatibility with older callers, but stepData owns inventory.
    const updatedTypeAData = {
      ...typeA,
      basePriceFrom: 1600000, // Partial Update
      parkingBays: 1,
      parkingType: 'carport',
    };

    const updatePayload = {
      ...fetched,
      unitTypes: [updatedTypeAData],
      stepData: {
        ...(fetched.stepData as any),
        unit_types: {
          ...((fetched.stepData as any)?.unit_types ?? {}),
          unitTypes: [updatedTypeAData],
        },
      },
    };

    await developmentService.updateDevelopment(createdDevId, testUserId, updatePayload as any);

    // Verify
    const updatedDev = await developmentService.getDevelopmentWithPhases(createdDevId);
    const updatedTypeA = updatedDev.unitTypes.find(u => u.name === 'Type A - V2');

    expect(updatedDev.unitTypes).toHaveLength(1);
    expect(Number(updatedTypeA.basePriceFrom)).toBe(1600000);
    expect(updatedTypeA.parkingType).toBe('carport');
    expect(updatedTypeA.parkingBays).toBe(1);
    expect(updatedTypeA.id).toBe(typeA.id);
    expect(updatedDev.unitTypes.find(u => u.name === 'Type B - Garage')).toBeUndefined();
  }, 30000);

  it('should preserve unit identity and omitted fields from a hydrated edit-style payload', async () => {
    const fetched = await developmentService.getDevelopmentWithPhases(createdDevId);
    const existingUnit = fetched.unitTypes[0];

    expect(existingUnit).toBeDefined();

    await developmentService.updateDevelopment(createdDevId, testUserId, {
      unitTypes: [
        {
          id: existingUnit.id,
          label: existingUnit.label,
          name: existingUnit.name,
          priceFrom: Number(existingUnit.basePriceFrom) + 25000,
          priceTo: Number(existingUnit.basePriceTo),
          unitSize: existingUnit.unitSize,
          parkingType: existingUnit.parkingType,
          parkingBays: existingUnit.parkingBays,
          totalUnits: existingUnit.totalUnits,
          availableUnits: existingUnit.availableUnits,
          reservedUnits: existingUnit.reservedUnits,
          configDescription: 'Hydrated edit roundtrip',
        },
      ],
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      completedSteps: ['identity_market', 'configuration'],
      stepData: {
        unit_types: {
          unitTypes: [{ id: existingUnit.id }],
        },
      },
      developmentData: {
        name: fetched.name,
        transactionType: 'for_sale',
      },
    } as any);

    const updatedDev = await developmentService.getDevelopmentWithPhases(createdDevId);
    const updatedUnit = updatedDev.unitTypes[0];

    expect(updatedDev.unitTypes).toHaveLength(1);
    expect(updatedUnit.id).toBe(existingUnit.id);
    expect(updatedUnit.name).toBe(existingUnit.name);
    expect(Number(updatedUnit.basePriceFrom)).toBe(Number(existingUnit.basePriceFrom) + 25000);
    expect(updatedUnit.description).toBe(existingUnit.description);
    expect(updatedUnit.configDescription).toBe('Hydrated edit roundtrip');
    expect(updatedUnit.totalUnits).toBe(existingUnit.totalUnits);
    expect(updatedUnit.availableUnits).toBe(existingUnit.availableUnits);
    expect(updatedUnit.reservedUnits).toBe(existingUnit.reservedUnits);
  }, 30000);

  it('should bridge canonical developmentData and stepData unit_types during update', async () => {
    const fetched = await developmentService.getDevelopmentWithPhases(createdDevId);
    const existingUnit = fetched.unitTypes[0];

    expect(existingUnit).toBeDefined();

    await developmentService.updateDevelopment(createdDevId, testUserId, {
      workflowId: 'residential_sale',
      currentStepId: 'unit_types',
      completedSteps: ['identity_market', 'configuration', 'location', 'unit_types'],
      developmentData: {
        name: 'Canonical Update Bridge',
        transactionType: 'for_sale',
        location: {
          city: 'Cape Town',
        },
      },
      stepData: {
        unit_types: {
          unitTypes: [
            {
              id: existingUnit.id,
              name: existingUnit.name,
              priceFrom: Number(existingUnit.basePriceFrom) + 50000,
              priceTo: Number(existingUnit.basePriceTo),
              unitSize: existingUnit.unitSize,
              parkingType: existingUnit.parkingType,
              parkingBays: existingUnit.parkingBays,
              totalUnits: existingUnit.totalUnits,
              availableUnits: existingUnit.availableUnits,
              reservedUnits: existingUnit.reservedUnits,
            },
          ],
        },
      },
    } as any);

    const updatedDev = await developmentService.getDevelopmentWithPhases(createdDevId);
    const updatedUnit = updatedDev.unitTypes[0];

    expect(updatedDev.name).toBe('Canonical Update Bridge');
    expect(updatedDev.city).toBe('Cape Town');
    expect(updatedDev.province).toBe(TEST_DEV_DATA.province);
    expect(updatedDev.description).toBe(TEST_DEV_DATA.description);
    expect(updatedDev.unitTypes).toHaveLength(1);
    expect(updatedUnit.id).toBe(existingUnit.id);
    expect(Number(updatedUnit.basePriceFrom)).toBe(Number(existingUnit.basePriceFrom) + 50000);
    expect(updatedUnit.description).toBe(existingUnit.description);
  }, 30000);

  it('should delete all unit types when update sends an explicit empty array', async () => {
    await developmentService.updateDevelopment(createdDevId, testUserId, {
      unitTypes: [],
    } as any);

    const updatedDev = await developmentService.getDevelopmentWithPhases(createdDevId);
    expect(updatedDev.unitTypes).toHaveLength(0);
  }, 30000);
});
