import dotenv from 'dotenv';
dotenv.config();
import { db, getDb } from '../server/db';
import { sql } from 'drizzle-orm';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run() {
  try {
    await getDb();
    console.log('Seeding price analytics...');

    // 1. Fetch cities
    const cities = await db.execute(sql`SELECT id, provinceId FROM cities`);
    const citiesRows = (cities[0] as any[]) || [];
    console.log(`Found ${citiesRows.length} cities. Seeding city_price_analytics...`);

    for (const city of citiesRows) {
      await db.execute(sql`
        INSERT INTO city_price_analytics (
          cityId, 
          provinceId, 
          currentAvgPrice, 
          currentMedianPrice, 
          currentMinPrice, 
          currentMaxPrice, 
          currentPriceCount, 
          activeListings
        ) VALUES (
          ${city.id},
          ${city.provinceId},
          ${randomInt(800000, 3500000)},
          ${randomInt(750000, 3000000)},
          ${randomInt(400000, 600000)},
          ${randomInt(5000000, 15000000)},
          ${randomInt(50, 500)},
          ${randomInt(20, 200)}
        )
      `);
    }

    // 2. Fetch suburbs
    const suburbs = await db.execute(sql`SELECT id, cityId FROM suburbs`);
    const suburbsRows = (suburbs[0] as any[]) || [];
    console.log(`Found ${suburbsRows.length} suburbs. Seeding suburb_price_analytics...`);

    // For suburbs, we need provinceId too, which isn't directly on suburbs table usually,
    // but the schema showed it in suburb_price_analytics. We need to join to get it or just lookup.
    // Let's do a join to get provinceId for each suburb
    const suburbsWithProvince = await db.execute(sql`
      SELECT s.id, s.cityId, c.provinceId
      FROM suburbs s
      JOIN cities c ON c.id = s.cityId
    `);
    const suburbsProvRows = (suburbsWithProvince[0] as any[]) || [];

    for (const suburb of suburbsProvRows) {
      await db.execute(sql`
        INSERT INTO suburb_price_analytics (
          suburbId,
          cityId,
          provinceId,
          currentAvgPrice,
          currentMedianPrice,
          currentPriceCount
        ) VALUES (
          ${suburb.id},
          ${suburb.cityId},
          ${suburb.provinceId},
          ${randomInt(800000, 3500000)},
          ${randomInt(750000, 3000000)},
          ${randomInt(10, 100)}
        )
      `);
    }

    console.log('Seeding complete.');
  } catch (error) {
    console.error('Error seeding analytics:', error);
  }
  process.exit(0);
}

run();
