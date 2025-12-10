# Task 19: Location Data Migration Guide

## Overview

This guide covers the migration of existing location data (provinces, cities, suburbs) to the new unified locations table structure required for the Google Places Autocomplete Integration.

## Migration Scripts

### 1. `generate-location-slugs.ts`
**Purpose**: Generate SEO-friendly slugs for all existing provinces, cities, and suburbs.

**What it does**:
- Scans provinces, cities, and suburbs tables for records without slugs
- Generates kebab-case slugs from location names
- Creates SEO titles and descriptions for each location
- Updates records with generated data

**Safe to run multiple times**: Yes - only updates records without slugs

**Example output**:
```
📍 Processing provinces...
  ✓ Gauteng → gauteng
  ✓ Western Cape → western-cape
✅ Updated 9 provinces
```

### 2. `sync-locations-table.ts`
**Purpose**: Sync existing location data to the unified locations table.

**What it does**:
- Creates location records for all provinces (type: 'province')
- Creates location records for all cities (type: 'city', linked to province)
- Creates location records for all suburbs (type: 'suburb', linked to city)
- Maintains hierarchical relationships using parentId
- Updates existing records if Place ID matches

**Safe to run multiple times**: Yes - updates existing records, doesn't duplicate

**Example output**:
```
📍 Syncing provinces...
  ✓ Created: Gauteng
  ✓ Created: Western Cape
✅ Synced 9 provinces

🏙️  Syncing cities...
  ✓ Created: Johannesburg (Gauteng)
  ✓ Created: Cape Town (Western Cape)
✅ Synced 13 cities
```

### 3. `migrate-listings-location-id.ts` (Optional)
**Purpose**: Link existing properties and developments to the locations table.

**What it does**:
- Finds matching location records for each property/development
- Updates location_id foreign key to link to locations table
- Maintains backward compatibility with legacy fields
- Processes in batches to avoid memory issues

**Safe to run multiple times**: Yes - only updates records without location_id

**When to run**: 
- Optional for initial launch
- Can be run gradually as needed
- Legacy fields (province, city, suburb) remain functional

**Example output**:
```
🏠 Migrating properties...
  ✓ Processed 100 properties...
  ✓ Processed 200 properties...
✅ Migrated 247 properties
⚠️  Skipped 3 properties (no matching location found)
```

### 4. `extract-legacy-location-data.ts`
**Purpose**: Utility to analyze and extract location data from legacy fields.

**What it does**:
- Analyzes existing property and development records
- Attempts to match legacy location data to locations table
- Reports confidence levels for matches
- Provides insights into data quality

**When to run**: Before migration to assess data quality

**Example output**:
```
📊 Analyzing properties table...
  Sample Analysis (100 properties):
  ✓ High confidence matches:   87
  ~ Medium confidence matches: 10
  ⚠ Low confidence matches:    2
  ✗ No matches:                1
```

### 5. `verify-location-migration.ts`
**Purpose**: Verify data integrity after migration.

**What it does**:
- Checks all provinces/cities/suburbs have slugs
- Verifies slug uniqueness within parent
- Validates hierarchical relationships
- Checks SEO field population
- Reports on listing migration status

**When to run**: After each migration step

**Example output**:
```
✅ 1. All provinces have slugs
     total: 9
     withoutSlugs: 0

✅ 2. All cities have slugs
     total: 13
     withoutSlugs: 0

✅ 3. Hierarchical integrity maintained
     orphaned: 0
```

### 6. `run-location-migration.ts` (Master Script)
**Purpose**: Interactive wizard that runs all migration steps in order.

**What it does**:
- Guides you through the complete migration process
- Runs scripts in the correct order
- Allows skipping optional steps
- Provides clear feedback and next steps

**Recommended**: Use this for first-time migration

## Migration Workflow

### Pre-Migration Checklist

- [ ] Database backup created
- [ ] Google Places migration completed (`add-google-places-fields.sql`)
- [ ] Review migration scripts
- [ ] Test environment available
- [ ] Downtime window scheduled (if needed)

### Step-by-Step Migration

#### Option A: Using the Master Script (Recommended)

```bash
npx tsx scripts/run-location-migration.ts
```

Follow the interactive prompts. The wizard will:
1. Generate slugs
2. Sync to locations table
3. (Optional) Migrate listings
4. Verify data integrity

#### Option B: Manual Step-by-Step

```bash
# Step 1: Generate slugs
npx tsx scripts/generate-location-slugs.ts

# Step 2: Sync to locations table
npx tsx scripts/sync-locations-table.ts

# Step 3: (Optional) Migrate listings
npx tsx scripts/migrate-listings-location-id.ts

# Step 4: Verify integrity
npx tsx scripts/verify-location-migration.ts
```

### Post-Migration Tasks

1. **Review Verification Results**
   - Check that all tests passed
   - Investigate any failed checks
   - Review skipped listings (if applicable)

2. **Test Location Pages**
   - Visit province pages: `/south-africa/gauteng`
   - Visit city pages: `/south-africa/gauteng/johannesburg`
   - Visit suburb pages: `/south-africa/gauteng/johannesburg/sandton`
   - Verify statistics display correctly

3. **Monitor Application**
   - Check for errors in logs
   - Monitor location-based queries
   - Verify search functionality

4. **Update Documentation**
   - Document any custom changes
   - Update team on new structure
   - Create runbook for future migrations

## Data Structure

### Before Migration

```
provinces (id, name, code, latitude, longitude)
    ↓
cities (id, name, provinceId, latitude, longitude)
    ↓
suburbs (id, name, cityId, latitude, longitude)

properties (id, province, city, suburb, ...)
developments (id, province, city, suburb, ...)
```

### After Migration

```
locations (id, name, slug, type, parentId, placeId, ...)
    ├─ type: 'province' (parentId: null)
    ├─ type: 'city' (parentId: province location)
    └─ type: 'suburb' (parentId: city location)

properties (id, locationId, province*, city*, suburb*, ...)
developments (id, locationId, province*, city*, suburb*, ...)

* Legacy fields maintained for backward compatibility
```

## Troubleshooting

### Issue: Duplicate slug errors

**Cause**: Multiple locations with same name in same parent

**Solution**:
```sql
-- Find duplicates
SELECT slug, parentId, COUNT(*) 
FROM locations 
GROUP BY slug, parentId 
HAVING COUNT(*) > 1;

-- Manually update slugs to be unique
UPDATE locations 
SET slug = 'sandton-2' 
WHERE id = 123;
```

### Issue: Orphaned locations

**Cause**: Parent location not created or deleted

**Solution**:
```bash
# Re-run sync script
npx tsx scripts/sync-locations-table.ts

# Or manually fix parent references
```

### Issue: Missing SEO fields

**Cause**: Script failed to generate SEO content

**Solution**:
```bash
# Re-run slug generation
npx tsx scripts/generate-location-slugs.ts
```

### Issue: Listings not migrating

**Cause**: No matching location found

**Solution**:
```bash
# Analyze data quality
npx tsx scripts/extract-legacy-location-data.ts

# Review skipped listings
# Manually create location records if needed
# Re-run listing migration
```

## Rollback Procedure

If you need to rollback the migration:

```sql
-- 1. Remove location_id from properties
UPDATE properties SET location_id = NULL;

-- 2. Remove location_id from developments
UPDATE developments SET location_id = NULL;

-- 3. Clear locations table (optional)
DELETE FROM locations WHERE type IN ('province', 'city', 'suburb');

-- 4. Clear slugs from legacy tables (optional)
UPDATE provinces SET slug = NULL, seo_title = NULL, seo_description = NULL;
UPDATE cities SET slug = NULL, seo_title = NULL, seo_description = NULL;
UPDATE suburbs SET slug = NULL, seo_title = NULL, seo_description = NULL;
```

**Note**: Legacy location fields (province, city, suburb) are never modified, so your application will continue to work even if you rollback.

## Performance Considerations

### Large Datasets

If you have thousands of properties/developments:

1. **Run listing migration in batches**:
   ```typescript
   // Modify migrate-listings-location-id.ts
   .limit(1000) // Process 1000 at a time
   ```

2. **Run during off-peak hours**:
   - Schedule migration for low-traffic periods
   - Monitor database load

3. **Use database indexes**:
   - Indexes are created by the migration SQL
   - Verify indexes exist: `SHOW INDEX FROM locations;`

### Memory Usage

Scripts are designed to process records one at a time to minimize memory usage. For very large datasets (100k+ records), consider:

- Running scripts on a server with adequate RAM
- Monitoring memory usage during migration
- Breaking migration into smaller batches

## FAQ

**Q: Can I run the migration multiple times?**
A: Yes, all scripts are idempotent and safe to re-run.

**Q: Will this break my existing application?**
A: No, legacy fields are maintained for backward compatibility.

**Q: Do I need to migrate listings immediately?**
A: No, listing migration is optional. New listings will use location_id automatically.

**Q: What if I add new provinces/cities/suburbs later?**
A: Run the sync script again, or create location records manually.

**Q: How do I know if migration was successful?**
A: Run the verification script - all checks should pass.

**Q: Can I customize the slug generation?**
A: Yes, modify the `generateSlug()` function in `generate-location-slugs.ts`.

## Support

For issues or questions:
1. Check the verification output
2. Review the troubleshooting section
3. Check application logs
4. Consult the design document: `design.md`
5. Review requirements: `requirements.md`

## Related Documentation

- [Google Places Integration Design](./design.md)
- [Requirements Document](./requirements.md)
- [Task List](./tasks.md)
- [Schema Quick Reference](./SCHEMA_QUICK_REFERENCE.md)
