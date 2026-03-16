-- P0-B hardening: daily rule-level delivery diagnostics for expected vs actual simulation

CREATE TABLE IF NOT EXISTS location_targeting_rule_daily_stats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  metric_date DATE NOT NULL,
  rule_id BIGINT NOT NULL,
  opportunities INT NOT NULL DEFAULT 0,
  eligible_passes INT NOT NULL DEFAULT 0,
  served_count INT NOT NULL DEFAULT 0,
  blocked_schedule INT NOT NULL DEFAULT 0,
  blocked_daily_cap INT NOT NULL DEFAULT 0,
  blocked_total_cap INT NOT NULL DEFAULT 0,
  blocked_pacing INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_ltrds_date_rule (metric_date, rule_id),
  KEY idx_ltrds_rule_date (rule_id, metric_date)
);
