SET @affordability_assessments_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'affordability_assessments'
);

SET @affordability_assessments_lock_sql = IF(
  @affordability_assessments_exists > 0,
  'ALTER TABLE affordability_assessments ADD COLUMN locked_at timestamp NULL, ADD COLUMN locked_by_deal_id int NULL, ADD COLUMN locked_by_user_id int NULL',
  'SELECT ''skip affordability_assessments missing for lock columns'''
);
PREPARE stmt_affordability_assessments_lock FROM @affordability_assessments_lock_sql;
EXECUTE stmt_affordability_assessments_lock;
DEALLOCATE PREPARE stmt_affordability_assessments_lock;

SET @affordability_assessments_lock_index_sql = IF(
  @affordability_assessments_exists > 0,
  'CREATE INDEX IF NOT EXISTS idx_affordability_assessments_locked_at ON affordability_assessments (locked_at)',
  'SELECT ''skip affordability_assessments missing for lock index'''
);
PREPARE stmt_affordability_assessments_lock_index FROM @affordability_assessments_lock_index_sql;
EXECUTE stmt_affordability_assessments_lock_index;
DEALLOCATE PREPARE stmt_affordability_assessments_lock_index;

SET @distribution_deals_exists = (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'distribution_deals'
);

SET @distribution_deals_add_snapshot_sql = IF(
  @distribution_deals_exists > 0,
  'ALTER TABLE distribution_deals ADD COLUMN affordability_match_snapshot_id varchar(36) NULL, ADD COLUMN affordability_purchase_price int NULL, ADD COLUMN affordability_assumptions_json json NULL',
  'SELECT ''skip distribution_deals missing for affordability snapshot columns'''
);
PREPARE stmt_distribution_deals_add_snapshot FROM @distribution_deals_add_snapshot_sql;
EXECUTE stmt_distribution_deals_add_snapshot;
DEALLOCATE PREPARE stmt_distribution_deals_add_snapshot;

SET @distribution_deals_add_snapshot_index_sql = IF(
  @distribution_deals_exists > 0,
  'CREATE INDEX IF NOT EXISTS idx_distribution_deals_affordability_snapshot ON distribution_deals (affordability_match_snapshot_id)',
  'SELECT ''skip distribution_deals missing for affordability snapshot index'''
);
PREPARE stmt_distribution_deals_add_snapshot_index FROM @distribution_deals_add_snapshot_index_sql;
EXECUTE stmt_distribution_deals_add_snapshot_index;
DEALLOCATE PREPARE stmt_distribution_deals_add_snapshot_index;
