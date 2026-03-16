-- P0-A0 / P0-A1 foundation: persistent analytics event store
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id VARCHAR(64) NOT NULL UNIQUE,
  event_type VARCHAR(128) NOT NULL,
  page VARCHAR(512) NULL,
  device_type VARCHAR(64) NULL,
  user_id VARCHAR(64) NULL,
  session_id VARCHAR(128) NULL,
  event_timestamp DATETIME(3) NOT NULL,
  received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  payload_json JSON NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'web',
  INDEX idx_analytics_event_type (event_type),
  INDEX idx_analytics_event_timestamp (event_timestamp),
  INDEX idx_analytics_page (page),
  INDEX idx_analytics_user (user_id),
  INDEX idx_analytics_session (session_id)
);
