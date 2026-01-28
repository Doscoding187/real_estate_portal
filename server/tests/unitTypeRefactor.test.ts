import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../db';
import { developmentService } from '../services/developmentService';
import { developments, unitTypes } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Mock Data
const TEST_DEV_NAME = 'Integration Test Dev Refactor';
const TEST_DEV_DATA = {
  name: TEST_DEV_NAME,
  developmentType: 'residential',
  address: '123 Test St',
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
    parkingType: 'covered', // V2 Field
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
  let createdDevId: number;

  beforeAll(async () => {
    // Cleanup any leftovers
    const db = await getDb();
    if (!db) throw new Error('DB connection failed');
    const existing = await db
      .select()
      .from(developments)
      .where(eq(developments.name, TEST_DEV_NAME));
    for (const dev of existing) {
      await developmentService.deleteDevelopment(dev.id, -1);
    }
  });

  afterAll(async () => {
    if (createdDevId) {
      await developmentService.deleteDevelopment(createdDevId, -1);
    }
  });

  it('should persist V2 unit types correctly', async () => {
    const payload = {
      ...TEST_DEV_DATA,
      unitTypes: V2_UNIT_DATA,
    };

    // 1. Create Development
    const dev = await developmentService.createDevelopment(1, payload as any);
    expect(dev).toBeDefined();
    createdDevId = dev.id;

    // 2. Fetch and Verify
    const fetched = await developmentService.getDevelopmentWithPhases(dev.id);
    const units = fetched.unitTypes;

    expect(units).toHaveLength(2);

    // Verify Type A (Covered Parking)
    const typeA = units.find(u => u.name === 'Type A - V2');
    expect(typeA).toBeDefined();
    expect(Number(typeA.basePriceFrom)).toBe(1500000);
    expect(typeA.unitSize).toBe(85);
    // Legacy Parking Mapping Check: 2 Covered -> '2' in DB? or 'covered' in parkingType?
    // Our mapping: kind='covered', bays=2 -> enum='2' (lines 1097)
    // parkingType should be 'covered' (line 1181)
    expect(typeA.parking).toBe('2');
    expect(typeA.parkingType).toBe('covered');
    expect(typeA.parkingBays).toBe(2);

    // Verify Type B (Garage)
    const typeB = units.find(u => u.name === 'Type B - Garage');
    expect(typeB).toBeDefined();
    expect(Number(typeB.basePriceFrom)).toBe(2500000);
    expect(typeB.parking).toBe('garage');
    expect(typeB.parkingType).toBe(null); // Garage stores type in parkingType only if tandem/side-by-side?
    // Wait, DB check: line 1186: if garage and not tandem/sbs, parkingType=null.
    // Correct.
  });

  it('should handle UPSERT (Update existing unit)', async () => {
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
          parkingType: 'open',
        },
      ],
    };

    await developmentService.updateDevelopment(createdDevId, 1, updatePayload as any);

    // Verify
    const updatedDev = await developmentService.getDevelopmentWithPhases(createdDevId);
    const updatedTypeA = updatedDev.unitTypes.find(u => u.name === 'Type A - V2');

    expect(Number(updatedTypeA.basePriceFrom)).toBe(1600000);
    expect(updatedTypeA.parkingType).toBe('open');
    expect(updatedTypeA.parkingBays).toBe(1);
    expect(updatedTypeA.parking).toBe('1'); // 1 Open -> '1'
  });
});
