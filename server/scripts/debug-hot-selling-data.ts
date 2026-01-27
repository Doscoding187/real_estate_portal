/**
 * Read-only helper to inspect the data used by the hot-selling developments query.
 * Run: npx tsx server/scripts/debug-hot-selling-data.ts
 */
import * as dotenv from 'dotenv';
import path from 'path';
import { eq, and, sql } from 'drizzle-orm';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getDb } from '../db-connection';
import { developments, unitTypes } from '../../drizzle/schema';

async function debugHotSellingData() {
  const db = await getDb();
  if (!db) {
    console.error('No DB connection');
    process.exit(1);
  }

  console.log('--- DEBUGGING HOT SELLING DEVELOPMENTS DATA ---');

  // 1. Fetch the 10 developments that would be shown on Home (province: Gauteng is default usually)
  const province = 'Gauteng'; // Hardcoded for debugging as per typical Home usage
  console.log(`Fetching top 10 published developments for ${province}...`);

  const devs = await db
    .select({
      id: developments.id,
      name: developments.name,
      images: developments.images,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
    })
    .from(developments)
    .where(
      and(
        eq(developments.isPublished, 1),
        eq(developments.province, province),
        // eq(developments.name, 'Service E2E Property Updated') // Uncomment to target specific dev
      ),
    )
    .limit(10);

  if (devs.length === 0) {
    console.log('No published developments found.');
    process.exit(0);
  }

  console.log(`Found ${devs.length} developments:\n`);
  devs.forEach((dev, i) => {
    console.log(`${i + 1}. ${dev.name}`);
  });

  process.exit(0);
}

debugHotSellingData().catch(err => {
  console.error(err);
  process.exit(1);
});
