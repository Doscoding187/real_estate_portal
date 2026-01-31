# Column Naming Convention

## Brand Profile ID Columns

**Current State**: Inconsistent naming across tables.

| Table          | Column Name                                                  | Notes                    |
| -------------- | ------------------------------------------------------------ | ------------------------ |
| `listings`     | `brand_profile_id`                                           | ✅ Short form            |
| `leads`        | `developer_brand_profile_id`                                 | ⚠️ Long form             |
| `developments` | `developer_brand_profile_id`<br>`marketing_brand_profile_id` | ⚠️ Long form (2 columns) |
| `audit_logs`   | `brand_profile_id`                                           | ✅ Short form            |

---

## Why the Inconsistency?

- **`developments`**: Has TWO brand columns (developer + marketing), so longer names disambiguate
- **`listings`**: Only ONE brand column, so short name is clearer
- **`leads`**: Historical naming (predates this refactor)

---

## Mapping for Developers

When writing to these tables, use the correct column:

```typescript
// Listings (short form)
await db.insert(listings).values({
  brandProfileId: context.brandProfileId, // ✅ Correct
});

// Leads (long form)
await db.insert(leads).values({
  developerBrandProfileId: context.brandProfileId, // ✅ Correct
});

// Developments (long form, two columns)
await db.insert(developments).values({
  developerBrandProfileId: context.brandProfileId, // ✅ Developer brand
  marketingBrandProfileId: null, // ✅ Marketing brand (if applicable)
});
```

---

## Recommendation

**Option A (Recommended)**: Standardize to `brand_profile_id` everywhere

- Rename `leads.developer_brand_profile_id` → `brand_profile_id`
- Rename `developments.developer_brand_profile_id` → `brand_profile_id`
- Keep `developments.marketing_brand_profile_id` as-is (it's a different concept)

**Option B (Current)**: Keep as-is, document clearly

- Developers must remember the mapping
- Risk of wiring the wrong column

**Decision**: Defer to post-launch cleanup. For now, use this mapping guide.

---

## Service Layer Helpers

To prevent errors, use helper functions:

```typescript
// Helper: Get the correct brand column name for a table
function getBrandColumnName(table: string): string {
  const mapping = {
    listings: 'brandProfileId',
    leads: 'developerBrandProfileId',
    developments: 'developerBrandProfileId',
    audit_logs: 'brandProfileId',
  };
  return mapping[table] || 'brandProfileId';
}
```

This prevents hardcoding column names in multiple places.
