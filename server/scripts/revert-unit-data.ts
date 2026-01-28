import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { getDb } from '../db-connection';
import { unitTypes } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) return;

  const id = '3a3d8ad5-c2f4-4775-8f96-ee66e86f9823';
  console.log(`Reverting unit: ${id}`);

  await db
    .update(unitTypes)
    .set({
      unitSize: null,
      yardSize: null,
      parkingType: null,
      parkingBays: 0,
    })
    .where(eq(unitTypes.id, id));

  console.log('Unit reverted to nulls.');

  process.exit(0);
}

main();
