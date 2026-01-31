# Task 6: End-to-End Testing - Proof Queries

## Test 1: Emulator Creates Development with Brand Context

### Action

1. Super admin logs in
2. Selects brand in Publisher Emulator (e.g., brand ID = 5)
3. Creates development "Test Heights"

### Proof Queries

```sql
-- Verify latest development has brand_profile_id set
SELECT
  id,
  name,
  developer_id,                    -- Should be NULL (emulator mode)
  developer_brand_profile_id,      -- Should be 5
  marketing_brand_profile_id,
  created_at
FROM developments
ORDER BY created_at DESC
LIMIT 1;

-- Expected: developer_id = NULL, developer_brand_profile_id = 5
```

```sql
-- Verify audit log entry exists
SELECT
  id,
  actor_user_id,
  brand_profile_id,
  action,
  entity,
  entity_id,
  created_at
FROM audit_logs
WHERE entity = 'development'
  AND action = 'create'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: brand_profile_id = 5, entity_id = <new development id>
```

---

## Test 2: Real Developer Creates Development

### Action

1. Real developer logs in (developer_id = 10)
2. Creates development "Real Estate Tower"

### Proof Queries

```sql
-- Verify latest development has developer_id set, NOT brand_profile_id
SELECT
  id,
  name,
  developer_id,                    -- Should be 10
  developer_brand_profile_id,      -- Should be NULL
  created_at
FROM developments
WHERE developer_id = 10
ORDER BY created_at DESC
LIMIT 1;

-- Expected: developer_id = 10, developer_brand_profile_id = NULL
```

---

## Test 3: Delete Seeded Brand (CASCADE Test)

### Setup

```sql
-- Find a seeded brand with content
SELECT
  id,
  brand_name,
  status,
  (SELECT COUNT(*) FROM developments WHERE developer_brand_profile_id = developer_brand_profiles.id) as dev_count,
  (SELECT COUNT(*) FROM listings WHERE brand_profile_id = developer_brand_profiles.id) as listing_count,
  (SELECT COUNT(*) FROM leads WHERE developer_brand_profile_id = developer_brand_profiles.id) as lead_count
FROM developer_brand_profiles
WHERE status = 'seeded'
  AND id = 5;  -- Use the brand from Test 1
```

### Before Delete

```sql
-- Count related records BEFORE deletion
SELECT
  'developments' as table_name,
  COUNT(*) as count
FROM developments
WHERE developer_brand_profile_id = 5

UNION ALL

SELECT
  'listings',
  COUNT(*)
FROM listings
WHERE brand_profile_id = 5

UNION ALL

SELECT
  'leads',
  COUNT(*)
FROM leads
WHERE developer_brand_profile_id = 5;
```

### Action

```sql
-- Delete the seeded brand
DELETE FROM developer_brand_profiles WHERE id = 5 AND status = 'seeded';
```

### After Delete (Proof Queries)

```sql
-- Verify developments are DELETED (CASCADE)
SELECT COUNT(*) as remaining_developments
FROM developments
WHERE developer_brand_profile_id = 5;

-- Expected: 0 (all deleted)
```

```sql
-- Verify listings are DELETED (CASCADE)
SELECT COUNT(*) as remaining_listings
FROM listings
WHERE brand_profile_id = 5;

-- Expected: 0 (all deleted)
```

```sql
-- Verify leads have brand_profile_id SET TO NULL (not deleted)
SELECT
  id,
  name,
  developer_brand_profile_id,  -- Should be NULL
  created_at
FROM leads
WHERE developer_brand_profile_id IS NULL
  AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- Expected: Leads still exist, but developer_brand_profile_id = NULL
```

```sql
-- Verify unit_types are DELETED (inherited CASCADE via developments)
SELECT COUNT(*) as remaining_units
FROM unit_types ut
WHERE NOT EXISTS (
  SELECT 1 FROM developments d
  WHERE d.id = ut.development_id
  AND d.developer_brand_profile_id = 5
);

-- Expected: All unit_types for deleted developments are gone
```

---

## Test 4: Audit Trail Verification

### Action

Perform multiple actions in emulator:

1. Create development
2. Create listing
3. Update development
4. Delete listing

### Proof Queries

```sql
-- Verify all actions are logged with correct context
SELECT
  id,
  actor_user_id,
  brand_profile_id,
  action,
  entity,
  entity_id,
  created_at
FROM audit_logs
WHERE brand_profile_id = 5
ORDER BY created_at DESC
LIMIT 10;

-- Expected: All 4 actions present with correct actor and brand
```

```sql
-- Verify brand history query performance (uses composite index)
EXPLAIN SELECT
  action,
  entity,
  entity_id,
  created_at
FROM audit_logs
WHERE brand_profile_id = 5
  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY created_at DESC;

-- Expected: Uses idx_audit_brand_date index (check "key" column)
```

---

## Test 5: Index Coverage Verification

### Leads by Brand

```sql
EXPLAIN SELECT id, name, email, created_at
FROM leads
WHERE developer_brand_profile_id = 5
ORDER BY created_at DESC;

-- Expected: Uses idx_leads_brand_profile_id
```

### Developments by Brand

```sql
EXPLAIN SELECT id, name, created_at
FROM developments
WHERE developer_brand_profile_id = 5;

-- Expected: Uses FK index (auto-created)
```

### Listings by Brand

```sql
EXPLAIN SELECT id, title, created_at
FROM listings
WHERE brand_profile_id = 5;

-- Expected: Uses idx_listings_brand_profile_id
```

### Audit Logs by Brand + Date

```sql
EXPLAIN SELECT action, entity, created_at
FROM audit_logs
WHERE brand_profile_id = 5
  AND created_at >= '2026-01-01'
ORDER BY created_at DESC;

-- Expected: Uses idx_audit_brand_date (composite index)
```

---

## Success Criteria

✅ **Test 1**: Emulator development has `developer_brand_profile_id` set, audit log exists  
✅ **Test 2**: Real developer development has `developer_id` set, `brand_profile_id` is NULL  
✅ **Test 3**: Deleting seeded brand cascades developments/listings, sets leads to NULL  
✅ **Test 4**: All audit log entries have correct actor + brand context  
✅ **Test 5**: All queries use appropriate indexes (no full table scans)

---

## Rollback Plan

If any test fails:

```sql
-- Rollback migrations in reverse order
-- (Manual rollback - create reverse migrations if needed)
```
