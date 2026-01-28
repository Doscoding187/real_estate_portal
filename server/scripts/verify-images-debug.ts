/**
 * Read-only helper to inspect image payloads for specific development IDs.
 * Run: npx tsx server/scripts/verify-images-debug.ts <id> [id...]
 */
import * as dotenv from 'dotenv';
import path from 'path';
import { inArray } from 'drizzle-orm';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getDb } from '../db-connection';
import { developments } from '../../drizzle/schema';

async function verifyImages() {
  const db = await getDb();
  if (!db) {
    console.error('No DB');
    process.exit(1);
  }

  const ids = process.argv
    .slice(2)
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value > 0);

  if (ids.length === 0) {
    console.log('Usage: npx tsx server/scripts/verify-images-debug.ts <id> [id...]');
    process.exit(1);
  }

  console.log('Fetching images for IDs:', ids);

  const devs = await db
    .select({
      id: developments.id,
      name: developments.name,
      images: developments.images,
    })
    .from(developments)
    .where(inArray(developments.id, ids));

  for (const dev of devs) {
    console.log(`\nDev: ${dev.name} (${dev.id})`);
    console.log(`Raw Length: ${dev.images?.length}`);
    console.log(`Raw Snippet: ${dev.images?.substring(0, 100)}`);
  }

  process.exit(0);
}

verifyImages();
