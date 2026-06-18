CREATE TABLE IF NOT EXISTS dle_evidence_artifact_access_grants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  artifact_id INT NOT NULL,
  development_id INT NOT NULL,
  lead_id INT NULL,
  distribution_deal_id INT NULL,
  distribution_program_id INT NULL,
  admin_review_item_id INT NULL,
  source_surface ENUM(
    'developer_leads_manager',
    'admin_review',
    'distribution_manager',
    'system'
  ) NOT NULL,
  granted_to_surface ENUM('admin_review', 'distribution_manager') NOT NULL,
  granted_to_user_id INT NULL,
  granted_to_role VARCHAR(80) NULL,
  access_level ENUM('metadata', 'download', 'review_mutation') NOT NULL,
  reason_code VARCHAR(80) NOT NULL,
  reason_note VARCHAR(2000) NULL,
  status ENUM('active', 'revoked', 'expired') NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP NULL,
  granted_by_user_id INT NOT NULL,
  revoked_by_user_id INT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dle_evidence_access_grants_artifact
    FOREIGN KEY (artifact_id) REFERENCES dle_evidence_artifacts(id) ON DELETE CASCADE,
  CONSTRAINT fk_dle_evidence_access_grants_development
    FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE,
  CONSTRAINT fk_dle_evidence_access_grants_lead
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  CONSTRAINT fk_dle_evidence_access_grants_distribution_deal
    FOREIGN KEY (distribution_deal_id) REFERENCES distribution_deals(id) ON DELETE SET NULL,
  CONSTRAINT fk_dle_evidence_access_grants_distribution_program
    FOREIGN KEY (distribution_program_id) REFERENCES distribution_programs(id) ON DELETE SET NULL,
  CONSTRAINT fk_dle_evidence_access_grants_granted_to_user
    FOREIGN KEY (granted_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_dle_evidence_access_grants_granted_by_user
    FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dle_evidence_access_grants_revoked_by_user
    FOREIGN KEY (revoked_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dle_evidence_access_grants_artifact_status
  ON dle_evidence_artifact_access_grants (artifact_id, status);

CREATE INDEX IF NOT EXISTS idx_dle_evidence_access_grants_deal_status
  ON dle_evidence_artifact_access_grants (distribution_deal_id, status);

CREATE INDEX IF NOT EXISTS idx_dle_evidence_access_grants_program_status
  ON dle_evidence_artifact_access_grants (distribution_program_id, status);

CREATE INDEX IF NOT EXISTS idx_dle_evidence_access_grants_admin_status
  ON dle_evidence_artifact_access_grants (admin_review_item_id, status);

CREATE INDEX IF NOT EXISTS idx_dle_evidence_access_grants_user_status
  ON dle_evidence_artifact_access_grants (granted_to_user_id, status);

CREATE INDEX IF NOT EXISTS idx_dle_evidence_access_grants_development_access
  ON dle_evidence_artifact_access_grants (development_id, access_level, status);
