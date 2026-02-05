import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  const checks = [
    { name: 'developments', q: sql`SELECT COUNT(*) as c FROM developments` },
    { name: 'listings', q: sql`SELECT COUNT(*) as c FROM listings` },
    { name: 'properties', q: sql`SELECT COUNT(*) as c FROM properties` },
    { name: 'explore_content', q: sql`SELECT COUNT(*) as c FROM explore_content` },
    { name: 'explore_shorts', q: sql`SELECT COUNT(*) as c FROM explore_shorts` },
  ];

  console.log('--- DB COUNTS ---');
  for (const item of checks) {
    try {
      const r: any = await db.execute(item.q);
      const row = (r as any).rows?.[0] ?? (r as any)[0] ?? null;
      const count = row?.c ?? row?.['COUNT(*)'] ?? row?.count ?? null;
      console.log(`${item.name}:`, count);
    } catch (e: any) {
      console.log(`${item.name}: ERROR (${e?.message})`);
    }
  }
  console.log('-----------------');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
