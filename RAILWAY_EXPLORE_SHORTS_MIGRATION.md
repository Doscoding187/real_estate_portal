# Railway Explore Shorts Migration Guide

## Issue
The `explore.getFeed` endpoint is returning a 500 error because the `explore_shorts` table is missing or has missing columns.

## Solution
Run the migration script to create/update the `explore_shorts` table with all required columns.

## Step 1: Run the Migration Script

```bash
# Set your Railway database connection string
export DATABASE_URL="your-railway-mysql-connection-string"

# Run the migration
tsx scripts/run-explore-shorts-migration.ts
```

## Step 2: Verify Tables Were Created

After running the migration, verify the tables exist:

```sql
-- Check if tables exist
SHOW TABLES LIKE 'explore%';

-- Check explore_shorts structure
DESCRIBE explore_shorts;

-- Check for data
SELECT COUNT(*) FROM explore_shorts;
```

## Expected Tables

The migration creates these tables:
1. **explore_shorts** - Main content table
2. **explore_interactions** - User interaction tracking
3. **explore_highlight_tags** - Highlight tag definitions
4. **explore_user_preferences** - User preference storage

## Missing Columns Issue

If you're still getting errors about missing columns (`content_type`, `topic_id`, `category_id`), you may need to add them manually:

```sql
-- Add missing columns to explore_shorts table
ALTER TABLE explore_shorts 
ADD COLUMN content_type VARCHAR(50) DEFAULT 'property' AFTER developer_id,
ADD COLUMN topic_id INT NULL AFTER content_type,
ADD COLUMN category_id INT NULL AFTER topic_id;

-- Add indexes for the new columns
CREATE INDEX idx_explore_shorts_content_type ON explore_shorts(content_type);
CREATE INDEX idx_explore_shorts_topic_id ON explore_shorts(topic_id);
CREATE INDEX idx_explore_shorts_category_id ON explore_shorts(category_id);
```

## Step 3: Seed Sample Data (Optional)

To test the Explore feed, you can seed some sample data:

```bash
tsx scripts/seed-explore-shorts-sample.ts
```

## Troubleshooting

### Error: Table already exists
If you get "table already exists" errors, the tables are already created. You may just need to add the missing columns (see above).

### Error: Foreign key constraint fails
Make sure the referenced tables exist:
- `listings`
- `developments`
- `agents`
- `developers`
- `users`

### Error: Cannot connect to database
Verify your `DATABASE_URL` environment variable is set correctly for Railway.

## Alternative: Direct SQL Execution on Railway

If you can't run the TypeScript script, you can execute the SQL directly on Railway:

1. Go to Railway dashboard
2. Open your MySQL database
3. Go to the "Query" tab
4. Copy and paste the contents of `drizzle/migrations/create-explore-shorts-tables.sql`
5. Execute the SQL
6. Then run the ALTER TABLE commands above to add missing columns

## Verification

After migration, test the endpoint:

```bash
curl https://realestateportal-production-9bb8.up.railway.app/api/trpc/explore.getFeed?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22feedType%22%3A%22recommended%22%2C%22limit%22%3A20%2C%22offset%22%3A0%2C%22userId%22%3Anull%7D%7D%7D
```

You should get a 200 response instead of 500.

## Next Steps

After the migration:
1. ✅ Tables created
2. ✅ Missing columns added
3. 🔄 Seed sample data (optional)
4. ✅ Test the Explore page
5. ✅ Verify no more 500 errors
