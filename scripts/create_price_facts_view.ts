import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    console.log('Creating price_facts view...');

    // Drop if exists
    await db.execute(sql`DROP VIEW IF EXISTS price_facts`);

    // Create View using LISTINGS (canonical) + UNIT_TYPES
    // Join by location_id -> locations.id
    // NO city-name matching fallback

    const viewSql = sql`
    CREATE VIEW price_facts AS
    
    -- 1. Listings (askingPrice OR monthlyRent)
    SELECT 
      'listing' as sourceType,
      li.id as sourceId,
      NULL as developmentId,
      li.province as province,
      li.createdAt as created_at,
      li.location_id as locationId,
      
      -- Derive City & Suburb IDs from Location Hierarchy
      CASE 
        WHEN loc.type = 'suburb' THEN loc.parentId 
        WHEN loc.type = 'city' THEN loc.id 
        ELSE NULL 
      END as cityLocationId,
      
      CASE 
        WHEN loc.type = 'suburb' THEN loc.id 
        ELSE NULL 
      END as suburbLocationId,
      
      -- Price: askingPrice for sale, monthlyRent for rent
      COALESCE(li.askingPrice, li.monthlyRent, 0) as priceAmount,
      
      -- Area from propertyDetails JSON
      CAST(JSON_UNQUOTE(JSON_EXTRACT(li.propertyDetails, '$.size')) AS UNSIGNED) as areaM2,
      
      li.action as offerKind,
      
      -- Active Status Logic
      CASE 
        WHEN li.status IN ('published', 'approved') THEN 1 
        ELSE 0 
      END as isActive
      
    FROM listings li
    LEFT JOIN locations loc ON li.location_id = loc.id
    WHERE li.location_id IS NOT NULL
    
    UNION ALL
    
    -- 2. Development Units
    SELECT 
      'unit_type' as sourceType,
      ut.id as sourceId,
      d.id as developmentId,
      d.province as province,
      ut.created_at as created_at,
      d.location_id as locationId,
      
      -- Derive City & Suburb IDs
      CASE 
        WHEN loc.type = 'suburb' THEN loc.parentId 
        WHEN loc.type = 'city' THEN loc.id 
        ELSE NULL 
      END as cityLocationId,
      
      CASE 
        WHEN loc.type = 'suburb' THEN loc.id 
        ELSE NULL 
      END as suburbLocationId,
      
      -- Price: Midpoint or From
      CASE
        WHEN ut.base_price_to IS NOT NULL AND ut.base_price_to > 0 
        THEN ROUND((ut.base_price_from + ut.base_price_to) / 2)
        ELSE ut.base_price_from
      END as priceAmount,
      
      ut.unit_size as areaM2,
      'development_unit' as offerKind,
      
      -- Active Logic
      CASE 
        WHEN d.isPublished = 1 AND ut.is_active = 1 THEN 1 
        ELSE 0 
      END as isActive
      
    FROM unit_types ut
    JOIN developments d ON ut.development_id = d.id
    LEFT JOIN locations loc ON d.location_id = loc.id
    WHERE d.location_id IS NOT NULL;
    `;

    await db.execute(viewSql);
    console.log('✅ price_facts view created successfully.');

    // Verification
    const count = await db.execute(
      sql`SELECT COUNT(*) as count, sourceType, isActive FROM price_facts GROUP BY sourceType, isActive`,
    );
    console.table((count as any)[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error creating view:', error);
    process.exit(1);
  }
}

main();
