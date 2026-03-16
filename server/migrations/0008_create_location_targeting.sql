-- P0-B1/P0-B2: Geographic dominance monetization and sponsored event tracking

CREATE TABLE IF NOT EXISTS location_targeting_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  target_type ENUM('hero_ad', 'featured_developer', 'recommended_agent', 'geo_listing') NOT NULL,
  target_id BIGINT NOT NULL,
  location_type ENUM('province', 'city', 'suburb') NOT NULL,
  location_id BIGINT NOT NULL,
  ranking INT NOT NULL DEFAULT 0,
  status ENUM('active', 'scheduled', 'expired', 'paused') NOT NULL DEFAULT 'scheduled',
  metadata JSON NULL,
  start_date DATETIME(3) NULL,
  end_date DATETIME(3) NULL,
  daily_impression_cap INT NOT NULL DEFAULT 0,
  total_impression_cap INT NOT NULL DEFAULT 0,
  pacing_minutes INT NOT NULL DEFAULT 0,
  last_served_at DATETIME(3) NULL,
  created_by BIGINT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_ltr_lookup (target_type, location_type, location_id, status, ranking),
  KEY idx_ltr_schedule (status, start_date, end_date),
  KEY idx_ltr_target (target_type, target_id)
);

CREATE TABLE IF NOT EXISTS location_targeting_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  rule_id BIGINT NOT NULL,
  event_type ENUM('served', 'click', 'lead') NOT NULL,
  context_type ENUM('hero', 'developer', 'agent', 'listing', 'feed', 'unknown') NOT NULL DEFAULT 'unknown',
  context_id BIGINT NULL,
  location_type ENUM('province', 'city', 'suburb') NULL,
  location_id BIGINT NULL,
  user_id BIGINT NULL,
  request_id VARCHAR(64) NULL,
  session_key VARCHAR(128) NULL,
  metadata JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_lte_rule_event_date (rule_id, event_type, created_at),
  KEY idx_lte_context (context_type, context_id, created_at),
  KEY idx_lte_location (location_type, location_id, created_at)
);
