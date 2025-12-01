# Quick Fix: Create Explore Tables on Railway

## The Easiest Way (2 minutes)

### Step 1: Open Railway Database Console

1. Go to https://railway.app/dashboard
2. Click on your project: **successful-tranquility**
3. Click on your **MySQL** database service
4. Click the **Query** tab

### Step 2: Run the SQL

Copy ALL the SQL from `RAILWAY_DIRECT_SQL.sql` and paste it into the Query tab, then click **Run**.

Or copy this:

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
  INDEX idx_explore_shorts_published (is_published, published_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create explore_interactions table
CREATE TABLE IF NOT EXISTS explore_interactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  short_id INT NOT NULL,
  user_id INT NULL,
  session_id VARCHAR(255) NOT NULL,
  interaction_type ENUM(
    'impression',
    'view',
    'skip',
    'save',
    'share',
    'contact',
    'whatsapp',
    'book_viewing'
  ) NOT NULL,
  duration INT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  feed_type ENUM('recommended', 'area', 'category', 'agent', 'developer') NOT NULL,
  feed_context JSON,
  device_type ENUM('mobile', 'tablet', 'desktop') NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  metadata JSON,
  INDEX idx_explore_interactions_short_id (short_id),
  INDEX idx_explore_interactions_user_id (user_id),
  INDEX idx_explore_interactions_session_id (session_id),
  INDEX idx_explore_interactions_type (interaction_type),
  INDEX idx_explore_interactions_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create explore_highlight_tags table
CREATE TABLE IF NOT EXISTS explore_highlight_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tag_key VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7),
  category VARCHAR(50),
  display_order INT DEFAULT 0 NOT NULL,
  is_active TINYINT DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_explore_highlight_tags_category (category),
  INDEX idx_explore_highlight_tags_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create explore_user_preferences table
CREATE TABLE IF NOT EXISTS explore_user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  preferred_locations JSON,
  budget_min INT,
  budget_max INT,
  property_types JSON,
  interaction_history JSON,
  saved_properties JSON,
  inferred_preferences JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables were created
SHOW TABLES LIKE 'explore%';
```

### Step 3: Verify

You should see 4 tables created:
- explore_shorts
- explore_interactions
- explore_highlight_tags
- explore_user_preferences

### Step 4: Test Your Upload

1. Go to your site: https://realestateportal-production-9bb8.up.railway.app
2. Login as your agent
3. Go to `/explore/upload`
4. Upload a new video/image
5. Go to `/explore` - you should see your upload!

## That's It!

The tables are now created and your Explore feature should work. The 500 error is already fixed in the code, so once the tables exist, everything will work.

---

**Note:** The foreign key constraints were removed from this SQL because they might fail if the referenced tables (listings, developments, agents, developers) don't exist or have different structures. The app will still work fine without them.
