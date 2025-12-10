# Location Pages Troubleshooting Guide

## Issue: "Location Not Found" Error

When navigating to province, city, or suburb pages, users are seeing "Location Not Found" instead of the template pages.

## Root Causes

There are three potential root causes:

### 1. Database Not Seeded
The `provinces`, `cities`, and `suburbs` tables may be empty or not properly populated.

### 2. Slug Matching Logic Issue
The URL slug format (e.g., `western-cape`) may not be matching the database names (e.g., `Western Cape`).

### 3. Route Conflicts
Other routes may be catching the location URLs before they reach the location page components.

## Diagnostic Steps

### Step 1: Check if Location Data Exists

Run this SQL query in your database:

```sql
SELECT 'Provinces' as table_name, COUNT(*) as count FROM provinces
UNION ALL
SELECT 'Cities', COUNT(*) FROM cities
UNION ALL
SELECT 'Suburbs', COUNT(*) FROM suburbs;
```

**Expected Result:**
- Provinces: 9 (South African provinces)
- Cities: 20+ 
- Suburbs: 12+

**If counts are 0:** You need to run the location hierarchy migration.

### Step 2: Test Slug Matching

Run this SQL query to test if slug matching works:

```sql
-- Test province matching
SELECT * FROM provinces WHERE LOWER(name) = 'gauteng';
SELECT * FROM provinces WHERE LOWER(name) = 'western cape';

-- Test city matching  
SELECT * FROM cities WHERE LOWER(name) = 'johannesburg';
SELECT * FROM cities WHERE LOWER(name) = 'cape town';

-- Test suburb matching
SELECT * FROM suburbs WHERE LOWER(name) = 'sandton';
SELECT * FROM suburbs WHERE LOWER(name) = 'green point';
```

**Expected Result:** Each query should return 1 row.

**If no results:** The slug conversion logic needs to be fixed.

### Step 3: Check Browser Console

1. Open browser Developer Tools (F12)
2. Navigate to a location page (e.g., `/gauteng`)
3. Check the Console tab for errors
4. Check the Network tab for the API call to `locationPages.getProvinceData`

**Look for:**
- 404 errors
- TRPC errors
- Database connection errors

## Solutions

### Solution 1: Seed Location Data

If the database is empty, run the location hierarchy migration:

```bash
# Option A: Run the migration SQL file directly
mysql -u your_user -p your_database < migrations/create-location-hierarchy.sql

# Option B: Create and run a migration script
npx tsx scripts/seed-location-data.ts
```

### Solution 2: Fix Slug Matching Logic

The current logic in `locationPagesService.ts` uses:

```typescript
eq(sql`LOWER(${provinces.name})`, provinceSlug.replace(/-/g, ' '))
```

This should work for most cases, but may fail if:
- The slug has special characters
- The database name has special characters (e.g., "KwaZulu-Natal")

**Improved matching logic:**

```typescript
// For provinces
const [province] = await db
  .select()
  .from(provinces)
  .where(sql`LOWER(REPLACE(${provinces.name}, ' ', '-')) = LOWER(${provinceSlug})`)
  .limit(1);

// Alternative: Use LIKE for more flexible matching
const [province] = await db
  .select()
  .from(provinces)
  .where(sql`LOWER(${provinces.name}) LIKE LOWER(${provinceSlug.replace(/-/g, '%')})`)
  .limit(1);
```

### Solution 3: Add Slug Column to Tables

For better performance and reliability, add a `slug` column to each table:

```sql
ALTER TABLE provinces ADD COLUMN slug VARCHAR(100);
ALTER TABLE cities ADD COLUMN slug VARCHAR(100);
ALTER TABLE suburbs ADD COLUMN slug VARCHAR(100);

-- Generate slugs from names
UPDATE provinces SET slug = LOWER(REPLACE(name, ' ', '-'));
UPDATE cities SET slug = LOWER(REPLACE(name, ' ', '-'));
UPDATE suburbs SET slug = LOWER(REPLACE(name, ' ', '-'));

-- Add indexes
CREATE INDEX idx_province_slug ON provinces(slug);
CREATE INDEX idx_city_slug ON cities(slug);
CREATE INDEX idx_suburb_slug ON suburbs(slug);
```

Then update the service to use the slug column:

```typescript
const [province] = await db
  .select()
  .from(provinces)
  .where(eq(provinces.slug, provinceSlug))
  .limit(1);
```

### Solution 4: Add Logging

Add detailed logging to the service to see what's happening:

```typescript
async getProvinceData(provinceSlug: string) {
  console.log(`[LocationPages] getProvinceData called with slug: "${provinceSlug}"`);
  
  const db = await getDb();
  const cleanName = provinceSlug.replace(/-/g, ' ');
  
  console.log(`[LocationPages] Searching for province with name: "${cleanName}"`);
  
  const [province] = await db
    .select()
    .from(provinces)
    .where(eq(sql`LOWER(${provinces.name})`, cleanName))
    .limit(1);
  
  console.log(`[LocationPages] Province found:`, province ? province.name : 'NOT FOUND');
  
  if (!province) {
    // Try alternative matching
    console.log(`[LocationPages] Trying alternative matching...`);
    const allProvinces = await db.select().from(provinces);
    console.log(`[LocationPages] Available provinces:`, allProvinces.map(p => p.name));
    return null;
  }
  
  // ... rest of the code
}
```

## Quick Fix Script

Create `scripts/fix-location-pages.ts`:

```typescript
import { db } from '../server/db';
import { provinces, cities, suburbs } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

async function fixLocationPages() {
  console.log('🔧 Fixing Location Pages...\n');
  
  // Step 1: Check if data exists
  const provinceCount = await db.select({ count: sql`COUNT(*)` }).from(provinces);
  console.log(`Provinces in database: ${provinceCount[0].count}`);
  
  if (provinceCount[0].count === 0) {
    console.log('❌ No provinces found. Running migration...');
    // Import and run the migration
    // ... migration code
  }
  
  // Step 2: Add slug columns if they don't exist
  try {
    await db.execute(sql`ALTER TABLE provinces ADD COLUMN IF NOT EXISTS slug VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE cities ADD COLUMN IF NOT EXISTS slug VARCHAR(100)`);
    await db.execute(sql`ALTER TABLE suburbs ADD COLUMN IF NOT EXISTS slug VARCHAR(100)`);
    console.log('✅ Slug columns added');
  } catch (error) {
    console.log('ℹ️  Slug columns may already exist');
  }
  
  // Step 3: Generate slugs
  await db.execute(sql`UPDATE provinces SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL`);
  await db.execute(sql`UPDATE cities SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL`);
  await db.execute(sql`UPDATE suburbs SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL`);
  console.log('✅ Slugs generated');
  
  // Step 4: Create indexes
  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_province_slug ON provinces(slug)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_city_slug ON cities(slug)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_suburb_slug ON suburbs(slug)`);
    console.log('✅ Indexes created');
  } catch (error) {
    console.log('ℹ️  Indexes may already exist');
  }
  
  console.log('\n✅ Location pages fixed!');
  process.exit(0);
}

fixLocationPages().catch(console.error);
```

## Testing

After applying fixes, test these URLs:

1. `/gauteng` - Should show Gauteng province page
2. `/western-cape` - Should show Western Cape province page
3. `/gauteng/johannesburg` - Should show Johannesburg city page
4. `/western-cape/cape-town` - Should show Cape Town city page
5. `/gauteng/johannesburg/sandton` - Should show Sandton suburb page

## Common Issues

### Issue: "Cannot read properties of null"
**Cause:** Database connection failed or returned null
**Fix:** Check DATABASE_URL environment variable

### Issue: Route shows 404 instead of "Location Not Found"
**Cause:** Route is not matching at all
**Fix:** Check route order in App.tsx - location routes should be near the end

### Issue: Page loads but shows no data
**Cause:** Data exists but stats/listings are empty
**Fix:** Check that properties table has data linked to the locations

## Next Steps

1. Run diagnostic queries to identify the specific issue
2. Apply the appropriate solution
3. Test all location page URLs
4. Monitor server logs for any errors
5. Consider adding slug columns for better performance
