# Manual Fix Steps for Location Pages

Since the automated scripts are having connection issues, follow these manual steps to fix the location pages.

## Step 1: Run SQL in TiDB Console

1. **Log into your TiDB Cloud Console**
   - Go to https://tidbcloud.com/
   - Navigate to your cluster: `listify_property_sa`

2. **Open the SQL Editor**
   - Click on "SQL Editor" or "Chat2Query"
   - Or use any MySQL client connected to your TiDB database

3. **Copy and paste the entire contents of `migrations/create-location-hierarchy.sql`**
   - This will create the tables and seed the data
   - Expected result: 9 provinces, 20+ cities, 12+ suburbs

4. **Add slug columns** (run this SQL after the migration):

```sql
-- Add slug columns for URL-friendly matching
ALTER TABLE provinces ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE suburbs ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- Generate slugs from names
UPDATE provinces SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;
UPDATE cities SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;
UPDATE suburbs SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_province_slug ON provinces(slug);
CREATE INDEX IF NOT EXISTS idx_city_slug ON cities(slug);
CREATE INDEX IF NOT EXISTS idx_suburb_slug ON suburbs(slug);
```

5. **Verify the data** (run this to check):

```sql
SELECT 'Provinces' as table_name, COUNT(*) as count FROM provinces
UNION ALL
SELECT 'Cities', COUNT(*) FROM cities
UNION ALL
SELECT 'Suburbs', COUNT(*) FROM suburbs;
```

Expected output:
- Provinces: 9
- Cities: 23
- Suburbs: 12

## Step 2: Update the Service File

1. **Backup the current service:**
   ```powershell
   copy server\services\locationPagesService.ts server\services\locationPagesService.backup.ts
   ```

2. **Replace with the improved version:**
   ```powershell
   copy server\services\locationPagesService.improved.ts server\services\locationPagesService.ts
   ```

## Step 3: Restart Your Development Server

1. Stop your current dev server (Ctrl+C)
2. Start it again:
   ```powershell
   npm run dev
   ```

## Step 4: Test the Location Pages

Visit these URLs in your browser:

1. http://localhost:5000/gauteng
2. http://localhost:5000/western-cape
3. http://localhost:5000/gauteng/johannesburg
4. http://localhost:5000/western-cape/cape-town
5. http://localhost:5000/gauteng/johannesburg/sandton

You should now see the location template pages instead of "Location Not Found".

## Troubleshooting

### If pages still show "Location Not Found":

1. **Check server logs** - Look for `[LocationPages]` messages
2. **Check browser console** (F12) - Look for any errors
3. **Verify slug data**:
   ```sql
   SELECT name, slug FROM provinces LIMIT 5;
   SELECT name, slug FROM cities LIMIT 5;
   SELECT name, slug FROM suburbs LIMIT 5;
   ```

### If slugs are NULL:

Run the UPDATE statements again:
```sql
UPDATE provinces SET slug = LOWER(REPLACE(name, ' ', '-'));
UPDATE cities SET slug = LOWER(REPLACE(name, ' ', '-'));
UPDATE suburbs SET slug = LOWER(REPLACE(name, ' ', '-'));
```

## What This Fix Does

1. **Creates location hierarchy** - Provinces → Cities → Suburbs
2. **Seeds South African data** - 9 provinces, major cities, sample suburbs
3. **Adds slug columns** - For URL-friendly matching (e.g., "Western Cape" → "western-cape")
4. **Updates service** - Uses improved slug-based matching logic
5. **Adds indexes** - For fast lookups

## Next Steps

Once the pages are working:
- Add more suburbs for your target areas
- Customize the page content and SEO
- Add property counts and statistics
- Integrate with your property search

## Need Help?

If you're still having issues:
1. Check `.kiro/specs/location-pages-system/TROUBLESHOOTING_GUIDE.md`
2. Verify your DATABASE_URL in `.env` is correct
3. Make sure your TiDB cluster is running and accessible
