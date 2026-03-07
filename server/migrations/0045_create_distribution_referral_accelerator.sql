CREATE TABLE IF NOT EXISTS affordability_assessments (
  id varchar(36) PRIMARY KEY,
  actor_user_id int NOT NULL,
  subject_name varchar(200),
  subject_phone varchar(50),
  gross_income_monthly int NOT NULL,
  deductions_monthly int NOT NULL DEFAULT 0,
  deposit_amount int NOT NULL DEFAULT 0,
  assumptions_json json NOT NULL,
  outputs_json json NOT NULL,
  location_filter_json json,
  credit_check_consent_given tinyint NOT NULL DEFAULT 0,
  credit_check_requested_at timestamp NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_affordability_assessments_actor (actor_user_id),
  INDEX idx_affordability_assessments_created_at (created_at),
  INDEX idx_affordability_assessments_credit_check (credit_check_consent_given)
);

CREATE TABLE IF NOT EXISTS affordability_match_snapshots (
  id varchar(36) PRIMARY KEY,
  assessment_id varchar(36) NOT NULL,
  matches_json json NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_affordability_match_snapshots_assessment (assessment_id),
  INDEX idx_affordability_match_snapshots_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS qualification_pack_exports (
  id varchar(36) PRIMARY KEY,
  assessment_id varchar(36) NOT NULL,
  match_snapshot_id varchar(36) NOT NULL,
  pdf_storage_key varchar(500),
  pdf_bytes text,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_qualification_pack_exports_assessment (assessment_id),
  INDEX idx_qualification_pack_exports_snapshot (match_snapshot_id),
  INDEX idx_qualification_pack_exports_created_at (created_at)
);

ALTER TABLE distribution_deals
  ADD COLUMN affordability_assessment_id varchar(36) NULL;

CREATE INDEX IF NOT EXISTS idx_distribution_deals_affordability_assessment
  ON distribution_deals (affordability_assessment_id);
