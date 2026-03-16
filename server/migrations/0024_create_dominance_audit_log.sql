CREATE TABLE IF NOT EXISTS dominance_audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  change_type VARCHAR(64) NOT NULL,
  dominance_layer VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id BIGINT NULL,
  actor_user_id BIGINT NULL,
  approved_by_user_id BIGINT NULL,
  validation_status ENUM('passed', 'failed', 'not_run', 'unknown') NOT NULL DEFAULT 'unknown',
  validation_reference JSON NULL,
  before_state JSON NULL,
  after_state JSON NULL,
  metadata JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_dal_change_created (change_type, created_at),
  KEY idx_dal_entity (entity_type, entity_id, created_at),
  KEY idx_dal_actor_created (actor_user_id, created_at)
);
