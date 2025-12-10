# Agency Content Attribution - Quick Start Guide

## Running the Migration

### Prerequisites
- Database connection configured in `.env`
- Node.js and npm installed
- Database backup completed (recommended)

### Step 1: Run the Migration

```bash
npm run tsx scripts/run-agency-attribution-migration.ts
```

This will:
1. Add `agency_id` column to `explore_shorts` table
2. Add `creator_type` and `agency_id` columns to `explore_content` table
3. Create performance indexes
4. Add foreign key constraints
5. Run verification queries

### Step 2: Verify the Migration

The script automatically runs verification queries. Check the output for:
- ✅ Columns created successfully
- ✅ Indexes created successfully
- ✅ Foreign keys created successfully

### Step 3: Test Agency Queries

```sql
-- Test agency feed query
SELECT * FROM explore_shorts 
WHERE agency_id = 1 
  AND is_published = 1 
ORDER BY published_at DESC 
LIMIT 10;

-- Test agency content query
SELECT * FROM explore_content 
WHERE agency_id = 1 
  AND is_active = 1 
ORDER BY created_at DESC 
LIMIT 10;
```

## Rollback (If Needed)

If you need to rollback the migration:

```bash
npm run tsx scripts/run-agency-attribution-migration.ts --rollback
```

This will:
1. Drop all composite indexes
2. Drop foreign key constraints
3. Drop indexes
4. Remove columns
5. Verify rollback success

## Common Issues

### Issue: "Duplicate column name 'agency_id'"
**Solution:** Migration already applied. Script will skip duplicate columns automatically.

### Issue: "Cannot add foreign key constraint"
**Solution:** Ensure `agencies` table exists and has records with valid IDs.

### Issue: "Table doesn't exist"
**Solution:** Ensure `explore_shorts` and `explore_content` tables exist. Run explore feed migrations first.

## Next Steps

After successful migration:
1. ✅ Database schema updated
2. ⏳ Implement service layer (Task 2)
3. ⏳ Implement API endpoints (Task 3)
4. ⏳ Update frontend components (Task 7)

## Manual Verification

If you want to manually verify the migration:

```sql
-- Check explore_shorts columns
DESCRIBE explore_shorts;

-- Check explore_content columns
DESCRIBE explore_content;

-- Check indexes
SHOW INDEX FROM explore_shorts WHERE Key_name LIKE '%agency%';
SHOW INDEX FROM explore_content WHERE Key_name LIKE '%agency%';

-- Check foreign keys
SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME IN ('explore_shorts', 'explore_content')
  AND CONSTRAINT_NAME LIKE '%agency%';
```

## Support

For issues or questions:
1. Check the migration logs for detailed error messages
2. Review `IMPLEMENTATION_SUMMARY.md` for technical details
3. Consult the design document at `design.md`
