import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();

    // 1. Backfill Properties
    console.log('--- Backfilling Properties ---');
    // @ts-ignore
    const propsResult = await db.execute(
      sql`SELECT id, title, placeId, city FROM properties WHERE location_id IS NULL`,
    );
    // @ts-ignore
    const properties = propsResult[0] as any[];
    console.log(`Found ${properties.length} properties to backfill.`);

    for (const prop of properties) {
      let locId: number | null = null;

      // Strategy A: placeId
      if (prop.placeId) {
        const match = await db.execute(
          sql`SELECT id FROM locations WHERE place_id = ${prop.placeId} LIMIT 1`,
        );
        // @ts-ignore
        if (match[0].length > 0) locId = match[0][0].id;
      }

      // Strategy B: Match 'city' column to locations name (best effort)
      if (!locId && prop.city) {
        try {
          const match = await db.execute(
            sql`SELECT id FROM locations WHERE name = ${prop.city} LIMIT 1`,
          );
          // @ts-ignore
          if (match[0].length > 0) locId = match[0][0].id;
        } catch (e) {
          console.log('Err matching city:', e);
        }
      }

      if (locId) {
        console.log(`✅ Linked Property ${prop.id} to Location ${locId}`);
        await db.execute(sql`UPDATE properties SET location_id = ${locId} WHERE id = ${prop.id}`);
      } else {
        console.log(`❌ Could not link Property ${prop.id} (${prop.city})`);
      }
    }

    // 2. Backfill Developments
    console.log('\n--- Backfilling Developments ---');
    // @ts-ignore
    const devResult = await db.execute(
      sql`SELECT id, name, city, suburb FROM developments WHERE location_id IS NULL`,
    );
    // @ts-ignore
    const developments = devResult[0] as any[];
    console.log(`Found ${developments.length} developments to backfill.`);

    for (const dev of developments) {
      let locId: number | null = null;

      if (dev.suburb && dev.city) {
        const match = await db.execute(sql`
                SELECT l.id 
                FROM locations l
                JOIN locations parent ON l.parentId = parent.id
                WHERE l.name = ${dev.suburb} 
                  AND parent.name = ${dev.city}
                  AND l.type = 'suburb'
                LIMIT 1
            `);
        // @ts-ignore
        if (match[0].length > 0) locId = match[0][0].id;
      }

      if (locId) {
        console.log(`✅ Linked Development ${dev.id} to Location ${locId}`);
        await db.execute(sql`UPDATE developments SET location_id = ${locId} WHERE id = ${dev.id}`);
      } else {
        console.log(`❌ Could not link Development ${dev.id} (${dev.city}, ${dev.suburb})`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
