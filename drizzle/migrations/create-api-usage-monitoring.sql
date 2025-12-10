-- API Usage Monitoring Tables
-- Requirements: 26.1-26.5

-- Table to store API usage logs
CREATE TABLE IF NOT EXISTS google_places_api_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  request_type ENUM('autocomplete', 'place_details', 'geocode', 'reverse_geocode') NOT NULL,
  session_token VARCHAR(255),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  response_time_ms INT NOT NULL,
  error_message TEXT,
  user_id INT,
  ip_address VARCHAR(45),
  
  INDEX idx_timestamp (timestamp),
  INDEX idx_request_type (request_type),
  INDEX idx_success (success),
  INDEX idx_session_token (session_token),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table to store daily API usage summaries
CREATE TABLE IF NOT EXISTS google_places_api_daily_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_requests INT NOT NULL DEFAULT 0,
  successful_requests INT NOT NULL DEFAULT 0,
  failed_requests INT NOT NULL DEFAULT 0,
  autocomplete_requests INT NOT NULL DEFAULT 0,
  place_details_requests INT NOT NULL DEFAULT 0,
  geocode_requests INT NOT NULL DEFAULT 0,
  reverse_geocode_requests INT NOT NULL DEFAULT 0,
  average_response_time_ms DECIMAL(10, 2),
  total_cost_usd DECIMAL(10, 4),
  
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table to store API usage alerts
CREATE TABLE IF NOT EXISTS google_places_api_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alert_type ENUM('usage_threshold', 'error_rate', 'cost_threshold', 'response_time') NOT NULL,
  threshold_value DECIMAL(10, 2) NOT NULL,
  current_value DECIMAL(10, 2) NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  
  INDEX idx_triggered_at (triggered_at),
  INDEX idx_alert_type (alert_type),
  INDEX idx_severity (severity),
  INDEX idx_resolved (resolved_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table to store API usage configuration
CREATE TABLE IF NOT EXISTS google_places_api_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default configuration values
INSERT INTO google_places_api_config (config_key, config_value, description) VALUES
  ('daily_request_limit', '10000', 'Maximum number of API requests allowed per day'),
  ('usage_alert_threshold', '0.8', 'Trigger alert when usage exceeds this percentage of daily limit (0.8 = 80%)'),
  ('error_rate_threshold', '0.05', 'Trigger alert when error rate exceeds this percentage (0.05 = 5%)'),
  ('response_time_threshold', '3000', 'Trigger alert when average response time exceeds this value in milliseconds'),
  ('cost_alert_threshold', '100', 'Trigger alert when daily cost exceeds this value in USD'),
  ('autocomplete_cost_per_1000', '2.83', 'Cost per 1000 autocomplete requests in USD'),
  ('place_details_cost_per_1000', '17.00', 'Cost per 1000 place details requests in USD'),
  ('geocode_cost_per_1000', '5.00', 'Cost per 1000 geocode requests in USD')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);
