# Running Mission Control Migrations on Railway

## Problem

The production deployment is failing because the database doesn't have the new columns:
- `kpi_cache` (JSON)
- `last_kpi_calculation` (TIMESTAMP)

These were added locally but need to be applied to the Railway production database.

## Solution: Run Migrations on Railway

### Option 1: Using Railway CLI (Recommended)

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project**:
   ```bash
   railway link
   ```

4. **Run the migration script**:
   ```bash
   railway run pnpm exec tsx scripts/run-mission-control-phase1-migrations.ts
   ```

### Option 2: Using Railway Dashboard

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select your project**: real_estate_portal
3. **Go to the service** (your app)
4. **Click on "Settings"** tab
5. **Scroll to "Service Variables"**
6. **Add a one-time command**:
   - Go to "Deploy" tab
   - Click "New Deployment"
   - In "Custom Start Command", enter:
     ```
     pnpm exec tsx scripts/run-mission-control-phase1-migrations.ts && node dist/index.js
     ```
   - This will run migrations then start the server

### Option 3: Manual SQL Execution

If the above options don't work, you can run the SQL directly:

1. **Connect to Railway MySQL**:
   - Go to Railway Dashboard
   - Click on your MySQL service
   - Copy the connection string
   - Use a MySQL client (MySQL Workbench, DBeaver, etc.)

2. **Run this SQL**:
   ```sql
   -- Add KPI caching columns
   ALTER TABLE `developers` 
   ADD COLUMN `kpi_cache` json NULL COMMENT 'Cached KPI data for mission control dashboard',
   ADD COLUMN `last_kpi_calculation` timestamp NULL COMMENT 'Timestamp of last KPI calculation for cache invalidation';

   -- Add index
   CREATE INDEX `idx_developers_last_kpi_calculation` ON `developers`(`last_kpi_calculation`);
   ```

3. **Verify the columns exist**:
   ```sql
   DESCRIBE developers;
   ```

   You should see `kpi_cache` and `last_kpi_calculation` in the output.

## Verification

After running migrations, verify they worked:

1. **Check Railway logs** for migration success messages
2. **Test the dashboard** - it should load without errors
3. **Check the database** - columns should exist

## Quick Fix (Temporary)

If you need the site working immediately while you run migrations:

1. **Revert the schema changes temporarily**:
   - Comment out `kpiCache` and `lastKpiCalculation` from `drizzle/schema.ts`
   - Redeploy

2. **Then run migrations**

3. **Uncomment the schema changes**

4. **Redeploy again**

## Current Status

- ✅ Local database: Migrations complete
- ❌ Railway database: Migrations needed
- ❌ Production site: Failing due to missing columns

## Next Steps

1. Run migrations on Railway using one of the options above
2. Verify the dashboard loads correctly
3. Test KPI functionality
4. Monitor for any other errors

## Support

If migrations fail:
- Check Railway logs for detailed error messages
- Verify DATABASE_URL is set correctly
- Ensure MySQL user has ALTER TABLE permissions
- Contact Railway support if database access issues persist
