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
    unitSize: 85, // V2 Field
    parkingType: 'carport', // V2 Field
    parkingBays: 2, // V2 Field
    // Legacy fields omitted to test mapping
  },
  {
    name: 'Type B - Garage',
    bedrooms: 3,
    bathrooms: 2.5,
    basePriceFrom: 2500000,
    unitSize: 120,
    parkingType: 'garage',
    parkingBays: 2,
  },
];

describe('Unit Type Refactoring Integration', () => {
  let testUserId: number;
  let testDeveloperId: number;
  let createdDevId: number;
  let skipTests = false;

  const getInsertId = (insertResult: unknown): number => {
    const candidate = Array.isArray(insertResult) ? insertResult[0] : insertResult;
    if (candidate && typeof candidate === 'object' && 'insertId' in candidate) {
      return Number((candidate as { insertId: number }).insertId);
    }
    throw new Error('Unable to read insertId from insert result');
  };

  beforeAll(async () => {
    // TODO(test-infra): Run this integration suite against a real listify_test DB in CI.
    if (!process.env.DATABASE_URL) {
      skipTests = true;
      return;
    }

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
    if (skipTests) return;

    const db = await getDb();
    if (!db) return;

    if (createdDevId) {
      await developmentService.deleteDevelopment(createdDevId, testUserId);
    }

    if (testDeveloperId) {
      await db.delete(developers).where(eq(developers.id, testDeveloperId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should persist V2 unit types correctly', async () => {
    if (skipTests) return;

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
  });

  it('should handle UPSERT (Update existing unit)', async () => {
    if (skipTests) return;

    const fetched = await developmentService.getDevelopmentWithPhases(createdDevId);
    const typeA = fetched.unitTypes.find(u => u.name === 'Type A - V2');

    // Update payload
    const updatePayload = {
      ...fetched,
      unitTypes: [
        {
          ...typeA,
          basePriceFrom: 1600000, // Partial Update
          parkingBays: 1,
          parkingType: 'carport',
        },
      ],
    };

    await developmentService.updateDevelopment(createdDevId, testUserId, updatePayload as any);

    // Verify
    const updatedDev = await developmentService.getDevelopmentWithPhases(createdDevId);
    const updatedTypeA = updatedDev.unitTypes.find(u => u.name === 'Type A - V2');

    expect(Number(updatedTypeA.basePriceFrom)).toBe(1600000);
    expect(updatedTypeA.parkingType).toBe('carport');
    expect(updatedTypeA.parkingBays).toBe(1);
  });
});
