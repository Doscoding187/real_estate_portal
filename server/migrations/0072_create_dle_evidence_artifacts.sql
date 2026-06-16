ALTER TABLE development_operating_events
  MODIFY COLUMN event_type ENUM(
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
    'evidence_artifact_requested',
    'evidence_artifact_submitted',
    'evidence_artifact_review_started',
    'evidence_artifact_accepted',
    'evidence_artifact_rejected',
    'evidence_artifact_expired',
    'evidence_artifact_withdrawn',
    'publish_status_changed',
    'operating_note_added'
  ) NOT NULL;

CREATE TABLE IF NOT EXISTS dle_evidence_artifacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  development_id INT NOT NULL,
  transaction_type ENUM('for_sale', 'for_rent', 'auction') NOT NULL,
  lead_id INT NULL,
  unit_type_id VARCHAR(36) NULL,
  distribution_deal_id INT NULL,
  artifact_role ENUM(
    'identity',
    'fica',
    'proof_of_funds',
    'application_form',
    'supporting',
    'buyer_intent',
    'finance_path',
    'sale_agreement',
    'deposit_proof',
    'completion_proof',
    'rental_fit',
    'proof_of_income',
    'bank_statements',
    'employment_confirmation',
    'deposit_readiness',
    'lease_pack',
    'signed_lease',
    'occupation_timing',
    'bidder_intent',
    'legal_pack_acknowledgement',
    'auction_terms_acceptance',
    'bidder_registration',
    'registration_deposit',
    'winning_bid_confirmation'
  ) NOT NULL,
  artifact_type ENUM('uploaded_file', 'external_link', 'manual_attestation', 'system_note')
    NOT NULL DEFAULT 'manual_attestation',
  storage_key VARCHAR(512) NULL,
  external_url VARCHAR(1024) NULL,
  display_name VARCHAR(160) NOT NULL,
  description VARCHAR(2000) NULL,
  status ENUM('requested', 'submitted', 'under_review', 'accepted', 'rejected', 'expired', 'withdrawn')
    NOT NULL DEFAULT 'submitted',
  review_owner ENUM('developer_sales', 'leasing_team', 'auction_team', 'distribution_manager', 'admin', 'system')
    NOT NULL,
  reviewed_by_user_id INT NULL,
  reviewed_at TIMESTAMP NULL,
  review_note VARCHAR(2000) NULL,
  metadata JSON NULL,
  created_by_user_id INT NULL,
  updated_by_user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dle_evidence_artifacts_development
    FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE,
  CONSTRAINT fk_dle_evidence_artifacts_lead
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  CONSTRAINT fk_dle_evidence_artifacts_unit_type
    FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE SET NULL,
  CONSTRAINT fk_dle_evidence_artifacts_distribution_deal
    FOREIGN KEY (distribution_deal_id) REFERENCES distribution_deals(id) ON DELETE SET NULL,
  CONSTRAINT fk_dle_evidence_artifacts_reviewed_by
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_dle_evidence_artifacts_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_dle_evidence_artifacts_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dle_evidence_artifacts_development
  ON dle_evidence_artifacts (development_id);

CREATE INDEX IF NOT EXISTS idx_dle_evidence_artifacts_lead
  ON dle_evidence_artifacts (lead_id);

CREATE INDEX IF NOT EXISTS idx_dle_evidence_artifacts_role
  ON dle_evidence_artifacts (development_id, artifact_role);

CREATE INDEX IF NOT EXISTS idx_dle_evidence_artifacts_status
  ON dle_evidence_artifacts (development_id, status);

CREATE INDEX IF NOT EXISTS idx_dle_evidence_artifacts_transaction
  ON dle_evidence_artifacts (development_id, transaction_type);
