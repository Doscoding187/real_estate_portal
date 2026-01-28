import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { persistUnitTypes } from '../services/developmentService';
import { getDb } from '../db-connection';
import { unitTypes, developments, developers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('No DB');
    return;
  }

  // 1. Create a dummy development to attach units to (to avoid FK errors)
  const devSlug = `test-dev-${Date.now()}`;
  const [devRes] = await db.insert(developments).values({
    name: 'Test Dev Unit Save',
    slug: devSlug,
    developmentType: 'residential',
    isPublished: 1,
    views: 0,
    isFeatured: 0,
    // Minimal required fields
    city: 'Test City',
    province: 'Test Province',
  } as any);
  const devId = devRes.insertId;
  console.log(`Created test development ID: ${devId}`);

  // 2. Mock Frontend Payload (single source of truth)
  // Based on UnitTypesPhase.tsx:
  // - unitSize maps to unitSize
  // - yardSize maps to yardSize
  const mockUnits = [
    {
      id: `unit-${Date.now()}-1`,
      name: 'Test Unit A',
      bedrooms: 2,
      bathrooms: 1,
      priceFrom: 1200000,
      unitSize: 80, // Frontend sends this
      yardSize: 40, // Frontend sends this
      parkingType: 'garage',
      parkingBays: 2,
      isActive: true,
      displayOrder: 0,
    },
    {
      id: `unit-${Date.now()}-2`,
      name: 'Test Unit B',
      bedrooms: 1,
      bathrooms: 1,
      priceFrom: 900000,
      // Intentional missing sizes
      isActive: true,
      displayOrder: 1,
    },
  ];

  console.log('Persisting units...', JSON.stringify(mockUnits, null, 2));

  try {
    await persistUnitTypes(db, devId, mockUnits);
    console.log('Persist complete.');

    // 3. Inspect what actually got saved
    const savedUnits = await db
      .select({
        id: unitTypes.id,
        unitSize: unitTypes.unitSize,
        yardSize: unitTypes.yardSize,
      })
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, devId));

    console.log('Saved Unit Rows:', savedUnits);

    // Verify unitSize persisted as expected.
  } catch (err) {
    console.error('Error persisting:', err);
  } finally {
    // Cleanup
    await db.delete(unitTypes).where(eq(unitTypes.developmentId, devId));
    await db.delete(developments).where(eq(developments.id, devId));
    console.log('Cleanup complete.');
    process.exit(0);
  }
}

main().catch(console.error);
