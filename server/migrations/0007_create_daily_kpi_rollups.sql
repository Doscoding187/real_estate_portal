-- P0-A2: Canonical daily KPI rollups (board-level financial artifacts)

CREATE TABLE IF NOT EXISTS daily_role_metrics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  metric_date DATE NOT NULL,
  role ENUM('agent', 'developer', 'private_seller') NOT NULL,
  active_accounts INT NOT NULL DEFAULT 0,
  new_subscriptions INT NOT NULL DEFAULT 0,
  churned_accounts INT NOT NULL DEFAULT 0,
  mrr DECIMAL(14,2) NOT NULL DEFAULT 0,
  expansion_revenue DECIMAL(14,2) NOT NULL DEFAULT 0,
  add_on_revenue DECIMAL(14,2) NOT NULL DEFAULT 0,
  arpu DECIMAL(14,2) NOT NULL DEFAULT 0,
  nrr DECIMAL(7,2) NOT NULL DEFAULT 100,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_daily_role_metrics_date_role (metric_date, role),
  KEY idx_daily_role_metrics_role (role),
  KEY idx_daily_role_metrics_date (metric_date)
);

CREATE TABLE IF NOT EXISTS daily_funnel_metrics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  metric_date DATE NOT NULL,
  role ENUM('agent', 'developer', 'private_seller') NOT NULL,
  role_selected INT NOT NULL DEFAULT 0,
  strategy_clicked INT NOT NULL DEFAULT 0,
  strategy_booked INT NOT NULL DEFAULT 0,
  upgrade_started INT NOT NULL DEFAULT 0,
  upgrade_completed INT NOT NULL DEFAULT 0,
  avg_decision_latency_ms DECIMAL(14,2) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_daily_funnel_metrics_date_role (metric_date, role),
  KEY idx_daily_funnel_metrics_role (role),
  KEY idx_daily_funnel_metrics_date (metric_date)
);
