ALTER TABLE distribution_deals
  ADD COLUMN market_mode ENUM('sale', 'rent') NULL AFTER development_id,
  ADD COLUMN developer_projection_revision VARCHAR(128) NULL AFTER market_mode,
  ADD COLUMN developer_terms_snapshot JSON NULL AFTER developer_projection_revision,
  ADD COLUMN developer_terms_digest VARCHAR(64) NULL AFTER developer_terms_snapshot;
