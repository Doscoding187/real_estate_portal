ALTER TABLE affordability_assessments
  ADD COLUMN locked_at timestamp NULL,
  ADD COLUMN locked_by_deal_id int NULL,
  ADD COLUMN locked_by_user_id int NULL;

CREATE INDEX idx_affordability_assessments_locked_at
  ON affordability_assessments (locked_at);

ALTER TABLE distribution_deals
  ADD COLUMN affordability_match_snapshot_id varchar(36) NULL,
  ADD COLUMN affordability_purchase_price int NULL,
  ADD COLUMN affordability_assumptions_json json NULL;

CREATE INDEX idx_distribution_deals_affordability_snapshot
  ON distribution_deals (affordability_match_snapshot_id);
