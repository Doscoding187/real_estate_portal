import { db, getDb } from '../server/db';
import { properties } from '../drizzle/schema';
import { sql, desc, count, inArray } from 'drizzle-orm';

async function checkCounts() {
  await getDb();
  console.log('Checking active listing counts per city...');

  const results = await db
    .select({
      city: properties.city,
      count: count(properties.id),
    })
    .from(properties)
    .where(inArray(properties.status, ['available', 'published', 'pending']))
    .groupBy(properties.city)
    .orderBy(desc(count(properties.id)));

  console.log('City Counts (Active Listings):');
  results.forEach(r => {
    console.log(`${r.city}: ${r.count}`);
  });

  process.exit(0);
}

checkCounts().catch(console.error);
