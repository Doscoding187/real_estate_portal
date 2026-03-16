-- P0-B demand-aware baseline: surface-level monetizable opportunity inventory

CREATE TABLE IF NOT EXISTS opportunities_by_surface_by_day (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  metric_date DATE NOT NULL,
  surface_type ENUM('hero', 'developer', 'agent', 'listing', 'feed', 'unknown') NOT NULL,
  target_type ENUM('hero_ad', 'featured_developer', 'recommended_agent', 'geo_listing') NOT NULL,
  location_type ENUM('province', 'city', 'suburb') NOT NULL,
  location_id BIGINT NOT NULL,
  requests INT NOT NULL DEFAULT 0,
  opportunity_slots INT NOT NULL DEFAULT 0,
  inventory_slots INT NOT NULL DEFAULT 0,
  eligible_slots INT NOT NULL DEFAULT 0,
  served_slots INT NOT NULL DEFAULT 0,
  blocked_config_slots INT NOT NULL DEFAULT 0,
  unfilled_slots INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_obsd_day_surface (metric_date, surface_type, target_type, location_type, location_id),
  KEY idx_obsd_surface_day (surface_type, metric_date),
  KEY idx_obsd_location_day (location_type, location_id, metric_date)
);
