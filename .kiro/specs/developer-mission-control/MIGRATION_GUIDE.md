# Mission Control Phase 1 - Migration Guide

## Overview

This guide explains how to run the database migrations for Mission Control Phase 1. These migrations add the necessary tables and columns to support the new dashboard features.

## What Gets Migrated

### 1. Activities Table
Creates a new `activities` table to track all developer activities:
- Lead captures
- Unit updates
- Media uploads
- Price changes
- OTP generations
- Viewing schedules

**File**: `drizzle/migrations/create-activities-table.sql`

### 2. Developer Notifications Table
Creates a new `developer_notifications` table for system notifications:
- New lead notifications
- Task reminders
- System alerts
- Performance updates

**File**: `drizzle/migrations/create-notifications-table.sql`

### 3. KPI Caching Fields
Adds caching fields to the `developers` table:
- `cached_kpis` (JSON) - Stores calculated KPI data
- `last_kpi_calculation` (TIMESTAMP) - Tracks cache freshness

**File**: `drizzle/migrations/add-kpi-caching-to-developers.sql`

## Prerequisites

1. **Database Access**: Ensure you have access to your MySQL database
2. **Environment Variables**: Verify `DATABASE_URL` is set in your `.env` file
3. **Backup**: Always backup your database before running migrations

## Running Migrations

### Option 1: Run All Migrations (Recommended)

Use the comprehensive migration runner that executes all three migrations in order:

```bash
pnpm exec tsx scripts/run-mission-control-phase1-migrations.ts
```

This script will:
- Connect to your database
- Run all three migrations in sequence
- Skip already-existing tables/columns
- Verify all migrations completed successfully
- Provide a detailed summary

### Option 2: Run Individual Migrations

If you need to run migrations separately:

#### Activities Table
```bash
pnpm exec tsx scripts/run-activities-migration.ts
```

#### Notifications Table
```bash
pnpm exec tsx scripts/run-notifications-migration.ts
```

#### KPI Caching
```bash
pnpm exec tsx scripts/run-kpi-caching-migration.ts
```

### Option 3: Verify Migrations Only

To check if migrations have already been applied:

```bash
pnpm exec tsx scripts/verify-mission-control-migrations.ts
```

## Expected Output

### Successful Migration

```
============================================================
MISSION CONTROL PHASE 1 - MIGRATION RUNNER
============================================================
This script will run all Phase 1 migrations:
1. Activities table
2. Developer notifications table
3. KPI caching fields
============================================================

📡 Connecting to database...
✅ Connected to database

============================================================
Running migration: Activities Table
============================================================
Found 2 SQL statements to execute

Executing statement 1/2...
SQL: CREATE TABLE IF NOT EXISTS activities...
✅ Success

Executing statement 2/2...
SQL: CREATE INDEX idx_activities_developer...
✅ Success

✅ Migration "Activities Table" completed successfully!

[... similar output for other migrations ...]

============================================================
Verifying migrations...
============================================================

1. Checking activities table...
✅ Activities table exists

2. Checking developer_notifications table...
✅ Notifications table exists

3. Checking KPI caching columns in developers table...
✅ KPI caching columns exist

============================================================
✅ All migrations verified successfully!

============================================================
MIGRATION SUMMARY
============================================================
Activities Table:    ✅ Success
Notifications Table: ✅ Success
KPI Caching:         ✅ Success
Verification:        ✅ Passed
============================================================

🎉 All Phase 1 migrations completed successfully!

Next steps:
1. Restart your development server
2. Test the Mission Control dashboard
3. Deploy to Railway when ready
```

### Already Applied

If migrations have already been applied, you'll see:

```
Executing statement 1/2...
SQL: CREATE TABLE IF NOT EXISTS activities...
⚠️  Already exists, skipping
```

This is normal and safe - the script will skip existing tables/columns.

## Troubleshooting

### Error: DATABASE_URL is not defined

**Solution**: Add `DATABASE_URL` to your `.env` file:
```
DATABASE_URL=mysql://user:password@host:port/database
```

### Error: Table already exists

**Solution**: This is usually safe to ignore. The migration script will skip existing tables. If you need to recreate a table:

1. Backup your data
2. Drop the table manually: `DROP TABLE activities;`
3. Re-run the migration

### Error: Connection refused

**Solution**: 
- Verify your database is running
- Check your DATABASE_URL is correct
- Ensure your database accepts connections from your IP

### Error: Access denied

**Solution**:
- Verify your database credentials
- Ensure your user has CREATE TABLE and ALTER TABLE permissions

## Post-Migration Steps

### 1. Restart Development Server

After running migrations, restart your development server to pick up the new schema:

```bash
# Stop the server (Ctrl+C)
# Then restart
pnpm run dev
```

### 2. Test the Dashboard

1. Navigate to the developer dashboard
2. Verify KPIs are loading
3. Check the activity feed
4. Test quick actions
5. Verify notifications appear

### 3. Deploy to Railway (Production)

When ready to deploy to production:

1. **Backup Production Database**
   ```bash
   # Use Railway CLI or dashboard to create a backup
   ```

2. **Run Migrations on Railway**
   ```bash
   # Option A: Use Railway CLI
   railway run pnpm exec tsx scripts/run-mission-control-phase1-migrations.ts
   
   # Option B: Add to Railway deployment
   # Add to package.json scripts:
   "migrate:mission-control": "tsx scripts/run-mission-control-phase1-migrations.ts"
   ```

3. **Verify Production**
   - Check Railway logs for migration success
   - Test the production dashboard
   - Monitor for errors

## Rollback

If you need to rollback the migrations:

### Activities Table
```sql
DROP TABLE IF EXISTS activities;
```

### Notifications Table
```sql
DROP TABLE IF EXISTS developer_notifications;
```

### KPI Caching
```sql
ALTER TABLE developers 
  DROP COLUMN IF EXISTS cached_kpis,
  DROP COLUMN IF EXISTS last_kpi_calculation;
```

**Note**: Always backup before rollback!

## Database Schema Reference

### Activities Table Schema

```sql
CREATE TABLE activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  developer_id INT NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSON,
  related_entity_type VARCHAR(50),
  related_entity_id INT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_activities_developer (developer_id),
  INDEX idx_activities_type (activity_type),
  INDEX idx_activities_created (created_at),
  
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
);
```

### Notifications Table Schema

```sql
CREATE TABLE developer_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  developer_id INT NOT NULL,
  user_id INT,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  severity ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_notifications_developer (developer_id),
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_read (read),
  INDEX idx_notifications_created (created_at),
  
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
);
```

### KPI Caching Columns

```sql
ALTER TABLE developers
  ADD COLUMN cached_kpis JSON,
  ADD COLUMN last_kpi_calculation TIMESTAMP;
```

## Support

If you encounter issues:

1. Check the error message carefully
2. Review the troubleshooting section above
3. Verify your database connection
4. Check Railway logs if deploying to production
5. Contact the development team if issues persist

## Next Steps

After successful migration:

1. ✅ Migrations complete
2. ✅ Server restarted
3. ✅ Dashboard tested
4. 📋 Deploy to Railway (when ready)
5. 📋 Monitor production logs
6. 📋 Collect user feedback
7. 📋 Plan Phase 2 features
