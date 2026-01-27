import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { getDb } from '../db-connection';
import { unitTypes } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('No DB');
    return;
  }

  const id = '3a3d8ad5-c2f4-4775-8f96-ee66e86f9823';
  console.log(`Inspecting unit: ${id}`);

  const rows = await db.select().from(unitTypes).where(eq(unitTypes.id, id));

  if (!rows[0]) {
    console.log('Unit not found');
  } else {
    const u = rows[0];
    console.log('Unit Data:', {
      id: u.id,
      unitSize: u.unitSize,
      yardSize: u.yardSize,
      priceFrom: u.priceFrom,
    });
  }

  process.exit(0);
}

main().catch(console.error);
