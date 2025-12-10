# Location Migration Quick Reference

## Quick Start

```bash
# Run complete migration (recommended)
npx tsx scripts/run-location-migration.ts

# Or run individual steps
npx tsx scripts/generate-location-slugs.ts
npx tsx scripts/sync-locations-table.ts
npx tsx scripts/migrate-listings-location-id.ts  # Optional
npx tsx scripts/verify-location-migration.ts
```

## Script Summary

| Script | Purpose | Required | Safe to Re-run |
|--------|---------|----------|----------------|
| `generate-location-slugs.ts` | Generate slugs for provinces/cities/suburbs | ✅ Yes | ✅ Yes |
| `sync-locations-table.ts` | Sync to unified locations table | ✅ Yes | ✅ Yes |
| `migrate-listings-location-id.ts` | Link listings to locations | ⚠️ Optional | ✅ Yes |
| `extract-legacy-location-data.ts` | Analyze data quality | ℹ️ Info only | ✅ Yes |
| `verify-location-migration.ts` | Verify integrity | ✅ Yes | ✅ Yes |
| `run-location-migration.ts` | Master wizard | ✅ Recommended | ✅ Yes |

## Common Commands

```bash
# Check data quality before migration
npx tsx scripts/extract-legacy-location-data.ts

# Run verification only
npx tsx scripts/verify-location-migration.ts

# Re-generate slugs
npx tsx scripts/generate-location-slugs.ts

# Re-sync locations
npx tsx scripts/sync-locations-table.ts
```

## Verification Checklist

After migration, verify:

- [ ] All provinces have slugs
- [ ] All cities have slugs  
- [ ] All suburbs have slugs
- [ ] Slugs are unique within parent
- [ ] Locations table is populated
- [ ] Hierarchical relationships are valid
- [ ] SEO fields are populated
- [ ] Location pages load correctly

## Troubleshooting

### Duplicate Slugs
```sql
SELECT slug, parentId, COUNT(*) 
FROM locations 
GROUP BY slug, parentId 
HAVING COUNT(*) > 1;
```

### Orphaned Locations
```sql
SELECT l1.id, l1.name, l1.type, l1.parentId
FROM locations l1
LEFT JOIN locations l2 ON l1.parentId = l2.id
WHERE l1.parentId IS NOT NULL AND l2.id IS NULL;
```

### Missing SEO Fields
```sql
SELECT COUNT(*) 
FROM locations 
WHERE seoTitle IS NULL OR seoDescription IS NULL;
```

## Rollback

```sql
-- Clear location_id from listings
UPDATE properties SET location_id = NULL;
UPDATE developments SET location_id = NULL;

-- Clear locations table (optional)
DELETE FROM locations WHERE type IN ('province', 'city', 'suburb');

-- Clear slugs (optional)
UPDATE provinces SET slug = NULL, seo_title = NULL, seo_description = NULL;
UPDATE cities SET slug = NULL, seo_title = NULL, seo_description = NULL;
UPDATE suburbs SET slug = NULL, seo_title = NULL, seo_description = NULL;
```

## Key Files

- **Migration Guide**: `TASK_19_MIGRATION_GUIDE.md`
- **Schema Reference**: `SCHEMA_QUICK_REFERENCE.md`
- **Design Doc**: `design.md`
- **Requirements**: `requirements.md`

## Support

1. Run verification: `npx tsx scripts/verify-location-migration.ts`
2. Check logs for errors
3. Review TASK_19_MIGRATION_GUIDE.md
4. Check database for data issues
