-- ============================================================================
-- Explore Partner Marketplace Schema Migration
-- ============================================================================
-- This migration adds the partner ecosystem, content governance, topics
-- navigation, and monetization framework to the Explore system.
-- ============================================================================

-- ============================================================================
-- PART 1: Partner Tiers Configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_tiers (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  allowed_content_types JSON NOT NULL,
  allowed_ctas JSON NOT NULL,
  requires_credentials BOOLEAN DEFAULT false,
  max_monthly_content INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data for 4 partner tiers
INSERT INTO partner_tiers (id, name, allowed_content_types, allowed_ctas, requires_credentials, max_monthly_content) VALUES
(1, 'Property Professional', 
 '["property_tour", "development_showcase", "agent_walkthrough"]', 
 '["view_listing", "contact", "save"]', 
 false, 50),
(2, 'Home Service Provider', 
 '["educational", "showcase", "how_to"]', 
 '["request_quote", "book_consult"]', 
 true, 20),
(3, 'Financial Partner', 
 '["educational", "market_insight"]', 
 '["check_eligibility", "learn_more"]', 
 true, 10),
(4, 'Content Educator', 
 '["educational", "inspiration", "trend"]', 
 '["follow", "save", "share"]', 
 false, 30);

-- ============================================================================
-- PART 2: Explore Partners Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS explore_partners (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  tier_id INT NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  trust_score DECIMAL(5,2) DEFAULT 50.00,
  service_locations JSON,
  approved_content_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_partner_tier (tier_id),
  INDEX idx_partner_verification (verification_status),
  INDEX idx_partner_trust (trust_score),
  FOREIGN KEY (tier_id) REFERENCES partner_tiers(id)
);

-- ============================================================================
-- PART 3: Topics for Intent-Based Navigation
-- ============================================================================

CREATE TABLE IF NOT EXISTS topics (
  id VARCHAR(36) PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  content_tags JSON,
  property_features JSON,
  partner_categories JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_topic_slug (slug),
  INDEX idx_topic_active (is_active, display_order)
);

-- Seed data for 8 core topics
INSERT INTO topics (id, slug, name, description, icon, display_order, content_tags, property_features, partner_categories) VALUES
(UUID(), 'find-your-home', 'Find Your Home', 'Discover your perfect property', '🏠', 1, 
 '["property", "listing", "for_sale"]', '[]', '["Property Professional"]'),
(UUID(), 'home-security', 'Home Security', 'Keep your home safe', '🔒', 2, 
 '["security", "safety", "alarm"]', '["security_estate", "24hr_security", "cctv"]', '["Home Service Provider"]'),
(UUID(), 'renovations', 'Renovations & Upgrades', 'Transform your space', '🔨', 3, 
 '["renovation", "upgrade", "remodel"]', '["renovated", "modern_finishes"]', '["Home Service Provider"]'),
(UUID(), 'finance-investment', 'Finance & Investment', 'Smart property decisions', '💰', 4, 
 '["finance", "investment", "bond", "mortgage"]', '[]', '["Financial Partner"]'),
(UUID(), 'architecture-design', 'Architecture & Design', 'Beautiful spaces', '📐', 5, 
 '["architecture", "design", "interior"]', '["architect_designed", "modern"]', '["Content Educator"]'),
(UUID(), 'first-time-buyers', 'First-Time Buyers', 'Start your property journey', '🎯', 6, 
 '["first_time", "starter", "affordable"]', '[]', '["Financial Partner", "Property Professional"]'),
(UUID(), 'smart-homes', 'Smart Homes', 'Connected living', '🤖', 7, 
 '["smart", "automation", "tech"]', '["smart_home", "automation"]', '["Home Service Provider"]'),
(UUID(), 'estate-living', 'Estate Living', 'Secure community lifestyle', '🏘️', 8, 
 '["estate", "community", "secure"]', '["security_estate", "gated"]', '["Property Professional"]');

-- ============================================================================
-- PART 4: Content-to-Topic Mapping
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_topics (
  content_id VARCHAR(36) NOT NULL,
  topic_id VARCHAR(36) NOT NULL,
  relevance_score DECIMAL(5,2) DEFAULT 1.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_id, topic_id),
  INDEX idx_content_topic (topic_id),
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- ============================================================================
-- PART 5: Content Approval Queue
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_approval_queue (
  id VARCHAR(36) PRIMARY KEY,
  content_id VARCHAR(36) NOT NULL,
  partner_id VARCHAR(36) NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'revision_requested') DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewer_id VARCHAR(36),
  feedback TEXT,
  auto_approval_eligible BOOLEAN DEFAULT false,
  INDEX idx_approval_status (status),
  INDEX idx_approval_partner (partner_id),
  FOREIGN KEY (partner_id) REFERENCES explore_partners(id) ON DELETE CASCADE
);

-- ============================================================================
-- PART 6: Extend Existing Explore Tables
-- ============================================================================

-- Add partner_id to explore_content
ALTER TABLE explore_content 
  ADD COLUMN IF NOT EXISTS partner_id VARCHAR(36),
  ADD COLUMN IF NOT EXISTS content_category ENUM('primary', 'secondary', 'tertiary') DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS badge_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_launch_content BOOLEAN DEFAULT false,
  ADD INDEX IF NOT EXISTS idx_content_partner (partner_id),
  ADD INDEX IF NOT EXISTS idx_content_category (content_category);

-- Add partner_id to explore_shorts
ALTER TABLE explore_shorts
  ADD COLUMN IF NOT EXISTS partner_id VARCHAR(36),
  ADD COLUMN IF NOT EXISTS content_category ENUM('primary', 'secondary', 'tertiary') DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS badge_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_launch_content BOOLEAN DEFAULT false,
  ADD INDEX IF NOT EXISTS idx_shorts_partner (partner_id),
  ADD INDEX IF NOT EXISTS idx_shorts_category (content_category);

-- ============================================================================
-- PART 7: Partner Subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  partner_id VARCHAR(36) NOT NULL,
  tier ENUM('free', 'basic', 'premium', 'featured') NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status ENUM('active', 'cancelled', 'expired') DEFAULT 'active',
  features JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_subscription_partner (partner_id),
  INDEX idx_subscription_status (status),
  FOREIGN KEY (partner_id) REFERENCES explore_partners(id) ON DELETE CASCADE
);

-- ============================================================================
-- PART 8: Content Quality Scores
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_quality_scores (
  content_id VARCHAR(36) PRIMARY KEY,
  overall_score DECIMAL(5,2) DEFAULT 50.00,
  metadata_score DECIMAL(5,2) DEFAULT 0,
  engagement_score DECIMAL(5,2) DEFAULT 0,
  production_score DECIMAL(5,2) DEFAULT 0,
  negative_signals INT DEFAULT 0,
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_quality_score (overall_score)
);

-- ============================================================================
-- PART 9: Boost Campaigns
-- ============================================================================

CREATE TABLE IF NOT EXISTS boost_campaigns (
  id VARCHAR(36) PRIMARY KEY,
  partner_id VARCHAR(36) NOT NULL,
  content_id VARCHAR(36) NOT NULL,
  topic_id VARCHAR(36) NOT NULL,
  budget DECIMAL(10,2) NOT NULL,
  spent DECIMAL(10,2) DEFAULT 0,
  status ENUM('draft', 'active', 'paused', 'completed', 'depleted') DEFAULT 'draft',
  start_date DATE NOT NULL,
  end_date DATE,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  cost_per_impression DECIMAL(6,4) DEFAULT 0.10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_boost_status (status),
  INDEX idx_boost_topic (topic_id, status),
  INDEX idx_boost_partner (partner_id),
  FOREIGN KEY (partner_id) REFERENCES explore_partners(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- ============================================================================
-- PART 10: Partner Leads
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_leads (
  id VARCHAR(36) PRIMARY KEY,
  partner_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  content_id VARCHAR(36),
  type ENUM('quote_request', 'consultation', 'eligibility_check') NOT NULL,
  status ENUM('new', 'contacted', 'converted', 'disputed', 'refunded') DEFAULT 'new',
  price DECIMAL(10,2) NOT NULL,
  contact_info JSON NOT NULL,
  intent_details TEXT,
  dispute_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_lead_partner (partner_id),
  INDEX idx_lead_status (status),
  INDEX idx_lead_type (type),
  FOREIGN KEY (partner_id) REFERENCES explore_partners(id) ON DELETE CASCADE
);

-- ============================================================================
-- PART 11: Marketplace Bundles
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_bundles (
  id VARCHAR(36) PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_audience VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bundle_partners (
  bundle_id VARCHAR(36) NOT NULL,
  partner_id VARCHAR(36) NOT NULL,
  category VARCHAR(100) NOT NULL,
  display_order INT DEFAULT 0,
  inclusion_fee DECIMAL(10,2),
  performance_score DECIMAL(5,2) DEFAULT 50.00,
  PRIMARY KEY (bundle_id, partner_id),
  INDEX idx_bundle_category (bundle_id, category),
  FOREIGN KEY (bundle_id) REFERENCES marketplace_bundles(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES explore_partners(id) ON DELETE CASCADE
);

-- ============================================================================
-- PART 12: Cold Start Infrastructure
-- ============================================================================

CREATE TABLE IF NOT EXISTS launch_phases (
  id VARCHAR(36) PRIMARY KEY,
  phase ENUM('pre_launch', 'launch_period', 'ramp_up', 'ecosystem_maturity') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  primary_content_ratio DECIMAL(3,2) DEFAULT 0.70,
  algorithm_weight DECIMAL(3,2) DEFAULT 0.00,
  editorial_weight DECIMAL(3,2) DEFAULT 1.00,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS launch_content_quotas (
  id VARCHAR(36) PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL,
  required_count INT NOT NULL,
  current_count INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_quota_type (content_type)
);

-- Seed launch content quotas
INSERT INTO launch_content_quotas (id, content_type, required_count, current_count) VALUES
(UUID(), 'property_tours', 50, 0),
(UUID(), 'neighbourhood_guides', 30, 0),
(UUID(), 'expert_tips', 50, 0),
(UUID(), 'market_insights', 20, 0),
(UUID(), 'service_showcases', 30, 0),
(UUID(), 'inspiration_pieces', 20, 0);

CREATE TABLE IF NOT EXISTS launch_metrics (
  id VARCHAR(36) PRIMARY KEY,
  metric_date DATE NOT NULL,
  topic_engagement_rate DECIMAL(5,2),
  partner_content_watch_rate DECIMAL(5,2),
  save_share_rate DECIMAL(5,2),
  weekly_visits_per_user DECIMAL(5,2),
  algorithm_confidence_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_metrics_date (metric_date)
);

CREATE TABLE IF NOT EXISTS user_onboarding_state (
  user_id VARCHAR(36) PRIMARY KEY,
  is_first_session BOOLEAN DEFAULT true,
  welcome_overlay_shown BOOLEAN DEFAULT false,
  welcome_overlay_dismissed BOOLEAN DEFAULT false,
  suggested_topics JSON,
  tooltips_shown JSON,
  content_view_count INT DEFAULT 0,
  save_count INT DEFAULT 0,
  partner_engagement_count INT DEFAULT 0,
  features_unlocked JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS founding_partners (
  partner_id VARCHAR(36) PRIMARY KEY,
  enrollment_date DATE NOT NULL,
  benefits_end_date DATE NOT NULL,
  pre_launch_content_delivered INT DEFAULT 0,
  weekly_content_delivered JSON,
  warning_count INT DEFAULT 0,
  status ENUM('active', 'warning', 'revoked') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES explore_partners(id) ON DELETE CASCADE
);

-- ============================================================================
-- Migration Complete
-- ============================================================================
