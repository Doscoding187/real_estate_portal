# Location Pages Quick Fix Guide

## The Problem

You're seeing "Location Not Found" because the location data (provinces, cities, suburbs) hasn't been seeded in your database.

## Quick Fix (Choose One Method)

### Method 1: Run the Migration SQL Directly (Recommended)

If you have access to your database (Railway, TiDB, or local MySQL):

1. **Find your database credentials** in `.env` or `.env.local`:
   ```
   DATABASE_URL=mysql://user:password@host:port/database
   ```

2. **Run the migration SQL file**:
   
   **Option A - Using MySQL CLI:**
   ```bash
   mysql -h your-host -u your-user -p your-database < migrations/create-location-hierarchy.sql
   ```

   **Option B - Using Railway/TiDB Web Console:**
   - Log into your database web console
   - Copy the contents of `migrations/create-location-hierarchy.sql`
   - Paste and execute in the SQL query window

   **Option C - Using a Database GUI (TablePlus, DBeaver, etc.):**
   - Connect to your database
   - Open `migrations/create-location-hierarchy.sql`
   - Execute the entire file

### Method 2: Check if Data Already Exists

Run this query in your database to check:

```sql
SELECT 'Provinces' as table_name, COUNT(*) as count FROM provinces
UNION ALL
SELECT 'Cities', COUNT(*) FROM cities
UNION ALL
SELECT 'Suburbs', COUNT(*) FROM suburbs;
```

**Expected Result:**
- Provinces: 9
- Cities: 20+
- Suburbs: 12+

**If you see these counts**, the data exists and the problem is different (see Method 3).

### Method 3: Fix Slug Matching (If Data Exists)

If the data exists but pages still show "Location Not Found", add slug columns:

```sql
-- Add slug columns
ALTER TABLE provinces ADD COLUMN slug VARCHAR(100);
ALTER TABLE cities ADD COLUMN slug VARCHAR(100);
ALTER TABLE suburbs ADD COLUMN slug VARCHAR(100);

-- Generate slugs
UPDATE provinces SET slug = LOWER(REPLACE(name, ' ', '-'));
UPDATE cities SET slug = LOWER(REPLACE(name, ' ', '-'));
UPDATE suburbs SET slug = LOWER(REPLACE(name, ' ', '-'));

-- Add indexes
CREATE INDEX idx_province_slug ON provinces(slug);
CREATE INDEX idx_city_slug ON cities(slug);
CREATE INDEX idx_suburb_slug ON suburbs(slug);
```

Then update the service file:

1. **Backup the current service:**
   ```bash
   copy server\services\locationPagesService.ts server\services\locationPagesService.backup.ts
   ```

2. **Replace with improved version:**
   ```bash
   copy server\services\locationPagesService.improved.ts server\services\locationPagesService.ts
   ```

3. **Restart your server**

## Testing

After applying the fix, test these URLs:

1. http://localhost:5000/gauteng
2. http://localhost:5000/western-cape
3. http://localhost:5000/gauteng/johannesburg
4. http://localhost:5000/western-cape/cape-town
5. http://localhost:5000/gauteng/johannesburg/sandton

## Troubleshooting

### Still seeing "Location Not Found"?

1. **Check server logs** - Look for `[LocationPages]` messages
2. **Check browser console** (F12) - Look for TRPC errors
3. **Verify data exists**:
   ```sql
   SELECT * FROM provinces LIMIT 5;
   SELECT * FROM cities LIMIT 5;
   SELECT * FROM suburbs LIMIT 5;
   ```

### Database connection issues?

1. **Check `.env` file** - Ensure DATABASE_URL is set
2. **Test connection**:
   ```bash
   npm run dev
   ```
   Look for database connection messages in the console

### Need to set DATABASE_URL?

Create or update `.env.local`:

```env
DATABASE_URL=mysql://user:password@host:port/database
```

Replace with your actual database credentials.

## What Each Fix Does

**Method 1 (Migration):**
- Creates provinces, cities, suburbs tables
- Seeds 9 South African provinces
- Seeds 20+ major cities
- Seeds 12+ sample suburbs
- Sets up proper relationships

**Method 2 (Check Data):**
- Verifies if data already exists
- Helps identify if the problem is elsewhere

**Method 3 (Slug Columns):**
- Adds dedicated slug columns for URL matching
- Generates URL-friendly slugs (e.g., "Western Cape" → "western-cape")
- Creates indexes for fast lookups
- Updates service to use slug matching

## Next Steps

1. Apply one of the fixes above
2. Restart your development server
3. Test the location page URLs
4. Check server logs for any errors

If you're still having issues after trying these fixes, check:
- `.kiro/specs/location-pages-system/TROUBLESHOOTING_GUIDE.md` for detailed debugging
- `.kiro/specs/location-pages-system/FIX_IMPLEMENTATION.md` for complete implementation guide
