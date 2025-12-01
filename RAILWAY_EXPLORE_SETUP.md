# Railway Explore Tables Setup

## Problem

You're seeing "No videos available" and 500 errors because the explore tables don't exist in your Railway production database yet.

## Solution

You need to run the migrations on Railway to create the tables.

### Option 1: Run Migrations via Railway CLI (Recommended)

```bash
# 1. Install Railway CLI if you haven't
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Link to your project
railway link

# 4. Run the migration script
railway run tsx scripts/run-explore-shorts-migration.ts

# 5. Seed the highlight tags
railway run tsx scripts/seed-explore-highlight-tags.ts

# 6. (Optional) Add sample data
railway run tsx scripts/seed-explore-shorts-sample.ts
```

### Option 2: Run SQL Directly in Railway Dashboard

1. Go to your Railway project dashboard
2. Click on your MySQL database
3. Go to the "Query" tab
4. Copy and paste the SQL from `drizzle/migrations/create-explore-shorts-tables.sql`
5. Click "Run Query"

### Option 3: Add to Your Deployment Process

Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "migrate:explore": "tsx scripts/run-explore-shorts-migration.ts",
    "seed:explore": "tsx scripts/seed-explore-highlight-tags.ts && tsx scripts/seed-explore-shorts-sample.ts"
  }
}
```

Then run on Railway:
```bash
railway run npm run migrate:explore
railway run npm run seed:explore
```

### Option 4: Manual SQL Execution

Connect to your Railway MySQL database and run:

```sql
-- Create explore_shorts table
CREATE TABLE IF NOT EXISTS explore_shorts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NULL,
  development_id INT NULL,
  agent_id INT NULL,
  developer_id INT NULL,
  title VARCHAR(255) NOT NULL,
  caption TEXT,
  primary_media_id INT NOT NULL,
  media_ids JSON NOT NULL,
  highlights JSON,
  performance_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
  boost_priority INT DEFAULT 0 NOT NULL,
  view_count INT DEFAULT 0 NOT NULL,
  unique_view_count INT DEFAULT 0 NOT NULL,
  save_count INT DEFAULT 0 NOT NULL,
  share_count INT DEFAULT 0 NOT NULL,
  skip_count INT DEFAULT 0 NOT NULL,
  average_watch_time INT DEFAULT 0 NOT NULL,
  view_through_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
  save_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
  share_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
  skip_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
  is_published TINYINT DEFAULT 1 NOT NULL,
  is_featured TINYINT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  published_at TIMESTAMP NULL,
  INDEX idx_explore_shorts_listing_id (listing_id),
  INDEX idx_explore_shorts_development_id (development_id),
  INDEX idx_explore_shorts_agent_id (agent_id),
  INDEX idx_explore_shorts_performance_score (performance_score DESC),
  INDEX idx_explore_shorts_boost_priority (boost_priority DESC),
  INDEX idx_explore_shorts_published (is_published, published_at DESC),
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create other tables (see full SQL in drizzle/migrations/create-explore-shorts-tables.sql)
```

## Verify Tables Exist

After running migrations, check if tables were created:

```bash
# Locally
tsx scripts/check-explore-tables.ts

# On Railway
railway run tsx scripts/check-explore-tables.ts
```

## Check Your Upload

After tables are created, check if your upload is in the database:

```sql
SELECT id, title, agent_id, developer_id, is_published, created_at 
FROM explore_shorts 
ORDER BY created_at DESC 
LIMIT 10;
```

## Troubleshooting

### Still seeing 500 errors?

1. **Check Railway logs:**
   ```bash
   railway logs
   ```

2. **Verify database connection:**
   - Make sure `DATABASE_URL` environment variable is set correctly
   - Check Railway MySQL service is running

3. **Check if tables exist:**
   ```bash
   railway run tsx scripts/check-explore-tables.ts
   ```

### Upload succeeded but no videos showing?

1. **Check if record was created:**
   ```sql
   SELECT * FROM explore_shorts WHERE agent_id = YOUR_AGENT_ID;
   ```

2. **Check is_published flag:**
   ```sql
   UPDATE explore_shorts SET is_published = 1 WHERE id = YOUR_SHORT_ID;
   ```

3. **Clear cache:**
   - The feed uses caching, so you might need to wait a few minutes
   - Or restart your Railway service to clear cache

## Quick Fix for Now

The code now handles missing tables gracefully, so the 500 error should be fixed. However, you still need to create the tables to see any content.

**Fastest solution:**
1. Run migrations on Railway (Option 1 above)
2. Upload a new video from your agent account
3. Refresh the explore page

---

**Need help?** Check the full migration SQL in:
- `drizzle/migrations/create-explore-shorts-tables.sql`
