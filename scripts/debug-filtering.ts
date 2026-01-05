import 'dotenv/config';
import { locationResolver } from '../server/services/locationResolverService';
import { getDb } from '../server/db';
import { properties } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { propertySearchService } from '../server/services/propertySearchService';

async function main() {
  console.log('--- Debugging Location Resolution & Filtering ---');
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  // Test 1: Resolve Durban
  console.log('\n1. Resolving City: Durban');
  const durban = await locationResolver.resolveLocation({
    provinceSlug: 'kwazulu-natal',
    citySlug: 'durban'
  });
  console.log('Resolution Result:', JSON.stringify(durban, null, 2));

  if (durban?.city) {
    const durbanProps = await db
      .select({ 
        id: properties.id,
        title: properties.title,
        city: properties.city,
        address: properties.address,
        cityId: properties.cityId,
        suburbId: properties.suburbId,
        status: properties.status,
        listingType: properties.listingType
      })
      .from(properties)
      .where(eq(properties.cityId, durban.city.id));
    console.log(`Properties in Durban (ID 11):`, JSON.stringify(durbanProps, null, 2));

    // Also check text matches for Umhlanga
    const umhlangaTextProps = await db
      .select({ id: properties.id, address: properties.address })
      .from(properties)
      .where(sql`LOWER(${properties.address}) LIKE '%umhlanga%'`);
    console.log(`Properties with 'Umhlanga' in address:`, JSON.stringify(umhlangaTextProps, null, 2));
  }

  // Test 2: Resolve Umhlanga
  console.log('\n2. Resolving Suburb: Umhlanga');
  const umhlanga = await locationResolver.resolveLocation({
    provinceSlug: 'kwazulu-natal',
    citySlug: 'durban', // Assuming Umhlanga is in Durban
    suburbSlug: 'umhlanga'
  });
  console.log('Resolution Result:', JSON.stringify(umhlanga, null, 2));

  if (umhlanga?.suburb) {
    const umhlangaCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(eq(properties.suburbId, umhlanga.suburb.id));
    console.log(`Properties with suburbId=${umhlanga.suburb.id}: ${umhlangaCount[0].count}`);
  }

  // Test 3: Text Fallback Check
  console.log('\n3. Text Fallback Check (LOWER matches)');
  const durbanTextCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(sql`LOWER(${properties.city}) = 'durban'`);
  console.log(`Properties with LOWER(city)='durban': ${durbanTextCount[0].count}`);

  // Test 4: Full Service Search (Simulation)
  console.log('\n4. simulating searchProperties call for City=Durban, Suburb=Umhlanga');
  const results = await propertySearchService.searchProperties({
    province: 'kwazulu-natal',
    city: 'durban',
    suburb: ['umhlanga']
  });
  console.log(`Service returned ${results.total} results`);
  if (results.total > 0) {
      console.log('Sample result:', JSON.stringify(results.properties[0], null, 2));
  }

  process.exit(0);
}

main().catch(console.error);
