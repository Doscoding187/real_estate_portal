
import 'dotenv/config';
import { getDb } from '../server/db-connection';
import { developments, unitTypes } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { updateDevelopment, getDevelopmentWithPhases } from '../server/services/developmentService';

// Mock Data
const MOCK_DEV_ID = 999999;
const MOCK_UNIT_ID = 'unit-test-persist-1';

const COMPLEX_IMAGES = [
  { url: 'https://example.com/hero.jpg', category: 'featured', caption: 'Create Hero' },
  { url: 'https://example.com/pool.jpg', category: 'amenities', caption: 'Pool' }
];

const COMPLEX_UNIT = {
  id: MOCK_UNIT_ID,
  name: 'Persistence Test Unit',
  bedrooms: 2,
  bathrooms: 2.5, // Check loose typing
  priceFrom: 1500000,
  // JSON Fields to verify
  specifications: { finishes: { paint: 'premium' } },
  amenities: { standard: ['fiber_ready'] },
  baseMedia: { gallery: [{ url: 'unit-img.jpg', category: 'interior' }] },
  // Ensure required fields for creation/upsert
  totalUnits: 10,
  availableUnits: 5,
  isActive: true,
  basePriceFrom: 1500000,
  basePriceTo: 2000000
};

async function runTest() {
  const db = await getDb();
  if (!db) throw new Error('No DB');

  console.log('--- 1. Cleanup Old Test Data ---');
  await db.delete(unitTypes).where(eq(unitTypes.developmentId, MOCK_DEV_ID));
  await db.delete(developments).where(eq(developments.id, MOCK_DEV_ID));

  try {
      // 1. Setup Initial State (Using Direct Insert to bypass creation validation, but creating a valid starting point)
      // We want to test 'updateDevelopment' mainly, so we need a record to update.
      const jsonImages = JSON.stringify(COMPLEX_IMAGES);
      await db.insert(developments).values({
          id: MOCK_DEV_ID,
          name: 'Persistence Test Dev',
          city: 'Test City',
          province: 'Test Province',
          images: jsonImages, 
          isFeatured: 0,
          views: 0
      });
      console.log('✅ Setup: Created Development');

      // 2. Full Update via Service (Simulate Wizard "Save All")
      // This tests if the service accepts our complex structures
      console.log('--- 2. Full Update (Simulating Wizard Save) ---');
      await updateDevelopment(MOCK_DEV_ID, -1, {
          name: 'Updated Name - Full Save',
          images: COMPLEX_IMAGES, // Passing objects!
          unitTypes: [COMPLEX_UNIT] // Passing units inside data
      });
      
      console.log('✅ Full Update completed');

      // Verify Full Update (Fetch Direct from DB to isolate persistence check)
      const devRaw = await db.query.developments.findFirst({ where: eq(developments.id, MOCK_DEV_ID) });
      const unitsRaw = await db.query.unitTypes.findMany({ where: eq(unitTypes.developmentId, MOCK_DEV_ID) });

      let imgCheck = false;
      try {
          const parsed = JSON.parse(devRaw.images);
          if (parsed[1]?.category === 'amenities') imgCheck = true;
      } catch (e) {}
      
      let unitCheck = unitsRaw.length === 1 && unitsRaw[0].specifications?.finishes?.paint === 'premium';
      
      console.log(`[Check 1] Complex Images Saved: ${imgCheck ? 'PASS' : 'FAIL'}`);
      console.log(`[Check 1] Unit JSON Saved: ${unitCheck ? 'PASS' : 'FAIL'}`);

      if (!imgCheck || !unitCheck) throw new Error('Full Update Verification Failed');


      // 3. Partial Update (The "Killer" Test)
      // We update ONLY the name. We expect images and unit types to remain untouched.
      console.log('\n--- 3. Partial Update (Simulating Name Change Only) ---');
      
      // IMPORTANT: Currently, updateDevelopment MIGHT overwrite images if not passed. 
      // This test detects that behavior.
      // We pass undefined for images and unitTypes.
      await updateDevelopment(MOCK_DEV_ID, -1, {
          name: 'Updated Name - Partial Save'
      });
      
      console.log('✅ Partial Update completed');

      // Verify Partial Update
      const devPartial = await db.query.developments.findFirst({ where: eq(developments.id, MOCK_DEV_ID) });
      const unitsPartial = await db.query.unitTypes.findMany({ where: eq(unitTypes.developmentId, MOCK_DEV_ID) });
      
      // Images should still exist
      const imagesSurvived = devPartial.images && devPartial.images.length > 5; // JSON string is long
      // Unit types should still exist
      const unitsSurvived = unitsPartial.length === 1;

      console.log(`[Check 2] Images Survived Partial Update: ${imagesSurvived ? 'PASS' : 'FAIL'}`);
      console.log(`[Check 2] Unit Types Survived Partial Update: ${unitsSurvived ? 'PASS' : 'FAIL'}`);

  } catch (e) {
      console.error('❌ Test Failed:', e);
  } finally {
      // Cleanup
      await db.delete(unitTypes).where(eq(unitTypes.developmentId, MOCK_DEV_ID));
      await db.delete(developments).where(eq(developments.id, MOCK_DEV_ID));
      console.log('--- Cleanup Complete ---');
      process.exit(0);
  }
}

runTest();
