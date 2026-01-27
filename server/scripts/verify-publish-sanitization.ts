/**
 * In-memory helper to verify publish sanitization without a real DB.
 * Run: npx tsx server/scripts/verify-publish-sanitization.ts
 */
import { persistUnitTypes } from '../services/developmentService';

async function main() {
  const inserted: any[] = [];

  const fakeDb = {
    select: (_cols?: any) => ({
      from: (_table: any) => ({
        where: async () => [],
      }),
    }),
    delete: (_table: any) => ({
      where: async () => ({}),
    }),
    insert: (_table: any) => ({
      values: async (payload: any) => {
        inserted.push(payload);
        return [{}];
      },
    }),
    update: (_table: any) => ({
      set: (_payload: any) => ({
        where: async () => ({}),
      }),
    }),
  };

  const payload = {
    id: '',
    name: 'Unit A',
    bedrooms: '2',
    bathrooms: '2.5',
    // Parking type stored directly
    parkingType: 'open',
    parkingBays: '2',
    structuralType: 'invalid',
    floors: '',
    ownershipType: 'sectional-title',
    basePriceFrom: '1000000',
    totalUnits: '10',
    availableUnits: '5',
  };

  await persistUnitTypes(fakeDb as any, 123, [payload]);

  if (inserted.length !== 1) {
    throw new Error(`Expected 1 insert, got ${inserted.length}`);
  }

  const row = inserted[0];
  const allowedParkingTypes = new Set(['none', 'open', 'covered', 'carport', 'garage']);
  if (row.parkingType && !allowedParkingTypes.has(row.parkingType)) {
    throw new Error(`Invalid parking type stored: ${row.parkingType}`);
  }

  if (row.structuralType !== null) {
    throw new Error(`Expected structuralType null, got ${row.structuralType}`);
  }

  if (row.floors !== null) {
    throw new Error(`Expected floors null, got ${row.floors}`);
  }

  if (row.basePriceFrom !== 1000000) {
    throw new Error(`Expected basePriceFrom 1000000, got ${row.basePriceFrom}`);
  }

  if (row.bedrooms !== 2 || row.bathrooms !== 2.5) {
    throw new Error(`Unexpected bedroom/bathroom values: ${row.bedrooms}, ${row.bathrooms}`);
  }

  console.log('verify-publish-sanitization: PASS');
}

main().catch(err => {
  console.error('verify-publish-sanitization: FAIL');
  console.error(err);
  process.exit(1);
});
