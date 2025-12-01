-- Create Explore Shorts Tables
-- Migration for Property Explore Shorts feature

-- Main explore_shorts table
CREATE TABLE IF NOT EXISTS explore_shorts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id INT NULL,
  development_id INT NULL,
  agent_id INT NULL,
  developer_id INT NULL,
  
  title VARCHAR(255) NOT NULL,
  caption TEXT,
  
  -- Media references
  primary_media_id INT NOT NULL,
  media_ids JSON NOT NULL,
  
  -- Highlights (max 4)
  highlights JSON,
  
  -- Performance metrics
  performance_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
  boost_priority INT DEFAULT 0 NOT NULL,
  
  -- Engagement metrics
  view_count INT DEFAULT 0 NOT NULL,
  unique_view_count INT DEFAULT 0 NOT NULL,
  save_count INT DEFAULT 0 NOT NULL,
  share_count INT DEFAULT 0 NOT NULL,
  skip_count INT DEFAULT 0 NOT NULL,
  average_watch_time INT DEFAULT 0 NOT NULL,
  
  -- Calculated rates
  view_through_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
  save_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
  share_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
  skip_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
  
  -- Status
  is_published TINYINT DEFAULT 1 NOT NULL,
  is_featured TINYINT DEFAULT 0 NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  published_at TIMESTAMP NULL,
  
  -- Indexes
  INDEX idx_explore_shorts_listing_id (listing_id),
  INDEX idx_explore_shorts_development_id (development_id),
  INDEX idx_explore_shorts_agent_id (agent_id),
  INDEX idx_explore_shorts_performance_score (performance_score DESC),
  INDEX idx_explore_shorts_boost_priority (boost_priority DESC),
  INDEX idx_explore_shorts_published (is_published, published_at DESC),
  
  -- Foreign keys
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Interactions tracking table
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
  
  -- Timing data
  duration INT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Context
  feed_type ENUM('recommended', 'area', 'category', 'agent', 'developer') NOT NULL,
  feed_context JSON,
  
  -- Device/location
  device_type ENUM('mobile', 'tablet', 'desktop') NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  
  -- Metadata
  metadata JSON,
  
  -- Indexes
  INDEX idx_explore_interactions_short_id (short_id),
  INDEX idx_explore_interactions_user_id (user_id),
  INDEX idx_explore_interactions_session_id (session_id),
  INDEX idx_explore_interactions_type (interaction_type),
  INDEX idx_explore_interactions_timestamp (timestamp DESC),
  
  -- Foreign keys
  FOREIGN KEY (short_id) REFERENCES explore_shorts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Highlight tags table
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

-- User preferences table
CREATE TABLE IF NOT EXISTS explore_user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  
  -- Preference data
  preferred_locations JSON,
  budget_min INT,
  budget_max INT,
  property_types JSON,
  
  -- Behavior tracking
  interaction_history JSON,
  saved_properties JSON,
  
  -- Calculated preferences
  inferred_preferences JSON,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
