import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { getDb } from '../db';
import { developments, developerBrandProfiles } from '../../drizzle/schema';
import { eq, isNotNull } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('DB not available');
    return;
  }

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

  console.log('Developments with Brand Profiles:', results);

  if (results.length === 0) {
    console.log('WARNING: No developments found with assigned Brand Profiles.');
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit());
