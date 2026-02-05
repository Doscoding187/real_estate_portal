import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Force load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath, override: true });

import { getDb } from '../db';
import { developments, developerBrandProfiles } from '../../drizzle/schema';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('DB not available');
    return;
  }

  let output = '';
  const log = (msg: string) => {
    output += msg + '\n';
  };

  log('--- Brand Profiles ---');
  const brands = await db
    .select({
      id: developerBrandProfiles.id,
      name: developerBrandProfiles.brandName,
      slug: developerBrandProfiles.slug,
    })
    .from(developerBrandProfiles);
  log(JSON.stringify(brands, null, 2));

  log('\n--- Developments ---');
  const devs = await db
    .select({
      id: developments.id,
      name: developments.name,
      slug: developments.slug,
      devOwnerType: developments.devOwnerType,
      developerId: developments.developerId,
      developerBrandProfileId: developments.developerBrandProfileId,
    })
    .from(developments);
  log(JSON.stringify(devs, null, 2));

  fs.writeFileSync('debug_output.log', output);
  console.log('Output written to debug_output.log');
  process.exit(0);
}

main().catch(console.error);
