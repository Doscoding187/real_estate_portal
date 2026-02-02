# Database Migration Workflow

## 🚨 Critical Rules

1. **Production is Read-Only** for schema changes. Never edit tables manually in TiDB.
2. **Local First**: All schema changes start in `drizzle/schema.ts` locally.
3. **Migrations**: Changes are propagated via Drizzle migrations.

## Baseline Information (Do Not Change)

- **Baseline Migration**: `30001_baseline.sql`
- **Baseline ID**: `30001` (Matches Production DB ID)
- **Hash**: `baseline`
- **Created At**: `1769994977000` (Approximate timestamp of baseline establishment)
- **Status**: Synced with Production schema as of Feb 2, 2026.

## Workflow

### 1. Make Schema Changes

Edit `drizzle/schema.ts` to define your new tables or columns.

### 2. Generate Migration

```bash
pnpm drizzle-kit generate
```

This compares `schema.ts` with your snapshot and generates SQL in `drizzle/migrations`.

### 3. Review SQL

Open the generated `.sql` file. Verify it only contains what you intended.

### 4. Apply Locally

```bash
pnpm drizzle-kit push
# OR
pnpm migration:sql
```

Verify the changes work in your local app.

### 5. Deploy

Commit the migration file. When deployed, the migration runner will apply it to production (Staging/Prod).

## Troubleshooting

**Mismatch IDs**: If Drizzle complains about missing migrations, check the `__drizzle_migrations` table in the database. The ID in the table must match the filename prefix of the migration.
