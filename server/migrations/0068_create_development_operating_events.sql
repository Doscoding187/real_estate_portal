CREATE TABLE IF NOT EXISTS development_operating_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  development_id INT NOT NULL,
  unit_type_id VARCHAR(36) NULL,
  lead_id INT NULL,
  distribution_deal_id INT NULL,
  transaction_type ENUM('for_sale', 'for_rent', 'auction') NOT NULL,
  event_type ENUM(
    'inventory_status_changed',
    'inventory_quantity_adjusted',
    'price_changed',
    'rent_changed',
    'auction_window_changed',
    'auction_outcome_recorded',
    'lead_stage_changed',
    'showing_scheduled',
    'application_status_changed',
    'registration_status_changed',
    'distribution_enabled',
    'distribution_disabled',
    'distribution_handoff_created',
    'publish_status_changed',
    'operating_note_added'
  ) NOT NULL,
  from_status VARCHAR(80) NULL,
  to_status VARCHAR(80) NULL,
  quantity_delta INT NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  metadata JSON NULL,
  actor_user_id INT NULL,
  source_surface ENUM(
    'developer_dashboard',
    'developer_units_manager',
    'developer_leads_manager',
    'distribution_manager',
    'admin_review',
    'system'
  ) NOT NULL DEFAULT 'developer_dashboard',
  event_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_development_operating_events_development
    FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE,
  CONSTRAINT fk_development_operating_events_unit_type
    FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE SET NULL,
  CONSTRAINT fk_development_operating_events_lead
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  CONSTRAINT fk_development_operating_events_distribution_deal
    FOREIGN KEY (distribution_deal_id) REFERENCES distribution_deals(id) ON DELETE SET NULL,
  CONSTRAINT fk_development_operating_events_actor
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_development_operating_events_development
  ON development_operating_events (development_id);

CREATE INDEX idx_development_operating_events_development_time
  ON development_operating_events (development_id, event_at);

CREATE INDEX idx_development_operating_events_event_type
  ON development_operating_events (event_type);

CREATE INDEX idx_development_operating_events_actor
  ON development_operating_events (actor_user_id);

CREATE INDEX idx_development_operating_events_unit
  ON development_operating_events (unit_type_id);

CREATE INDEX idx_development_operating_events_lead
  ON development_operating_events (lead_id);

CREATE INDEX idx_development_operating_events_deal
  ON development_operating_events (distribution_deal_id);
