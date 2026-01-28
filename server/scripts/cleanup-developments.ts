import * as dotenv from 'dotenv';
import path from 'path';
import { inArray, eq } from 'drizzle-orm';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getDb } from '../db-connection';
import { developments, unitTypes } from '../../drizzle/schema';

async function cleanupDevelopments() {
  const db = await getDb();
  if (!db) {
    console.error('No DB connection');
    process.exit(1);
  }

  const idsToDelete = [1060002, 1060003, 1330001];
  const idsToKeep = [1630000, 1660000];

  console.log('--- CLEANUP JUNK DEVELOPMENTS ---');
  console.log('Target IDs to delete:', idsToDelete);

  // 1. Sanity Check - Check existence before delete
  const existing = await db
    .select({ id: developments.id, name: developments.name })
    .from(developments)
    .where(inArray(developments.id, idsToDelete));

  console.log(`Found ${existing.length} developments to delete:`);
  existing.forEach(d => console.log(` - ${d.name} (${d.id})`));

  if (existing.length === 0) {
    console.log('No targets found. They might have been deleted already.');
  } else {
    // 2. Perform Delete
    // Since cascade is enabled on foreign keys in schema (e.g. unitTypes),
    // deleting the parent development should clean up children.
    console.log('Deleting...');
    const result = await db.delete(developments).where(inArray(developments.id, idsToDelete));
    console.log('Delete operation completed.');
    // Drizzle result might vary by driver, often gives rowsAffected in array or object
    // console.log('Result:', result);
  }

  // 3. Verify Deletion
  const verifyDeleted = await db
    .select({ id: developments.id })
    .from(developments)
    .where(inArray(developments.id, idsToDelete));

  if (verifyDeleted.length === 0) {
    console.log('✅ Verification Successful: All target IDs are gone.');
  } else {
    console.error('❌ Verification Failed: Some IDs still exist:', verifyDeleted);
  }

  // 4. Verify Keepers
  const verifyKeepers = await db
    .select({ id: developments.id, name: developments.name })
    .from(developments)
    .where(inArray(developments.id, idsToKeep));

  console.log(`\nVerifying Keepers (Expected ${idsToKeep.length}):`);
  if (verifyKeepers.length === idsToKeep.length) {
    console.log('✅ All keepers are safe.');
    verifyKeepers.forEach(d => console.log(` - ${d.name} (${d.id})`));
  } else {
    console.error(`❌ Warning: Found ${verifyKeepers.length} keepers out of ${idsToKeep.length}.`);
    verifyKeepers.forEach(d => console.log(` - Found: ${d.name} (${d.id})`));
  }

  process.exit(0);
}

cleanupDevelopments().catch(err => {
  console.error(err);
  process.exit(1);
});
