
import { getDb } from '../server/db';
import { provinces } from '../drizzle/schema';

async function checkProvinces() {
  const db = await getDb();
  const allProvinces = await db.select().from(provinces);
  console.log('Provinces found:', allProvinces);
  process.exit(0);
}

checkProvinces();
