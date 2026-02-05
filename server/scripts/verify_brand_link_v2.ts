import dotenv from 'dotenv';
import path from 'path';

// Force load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath, override: true });

// Check DB credentials
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.error('CRITICAL: No database credentials found in environment!');
  process.exit(1);
}

import { getDb } from '../db';
import { developments, developerBrandProfiles } from '../../drizzle/schema';
import { eq, isNotNull } from 'drizzle-orm';

async function main() {
  console.log('Starting verification script v2...');
  try {
    const db = await getDb();
    if (!db) {
      console.error('DB not available - getDb() returned null');
      process.exit(1);
    }

    console.log('Connected to DB. Querying developments...');
    // Simple query to verify connection first
    const count = await db.select({ id: developments.id }).from(developments).limit(1);
    console.log(`DB Connection OK. Found ${count.length} developments (sanity check).`);

    const results = await db
      .select({
        devId: developments.id,
        devName: developments.name,
        brandId: developments.developerBrandProfileId,
        brandName: developerBrandProfiles.brandName,
      })
      .from(developments)
      .leftJoin(
        developerBrandProfiles,
        eq(developments.developerBrandProfileId, developerBrandProfiles.id),
      )
      .where(isNotNull(developments.developerBrandProfileId))
      .limit(10);

    console.log('Developments with Brand Profiles:', JSON.stringify(results, null, 2));

    if (results.length === 0) {
      console.log('WARNING: No developments found with assigned Brand Profiles.');
    } else {
      console.log('SUCCESS: Found developments linked to brand profiles.');
    }
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
