ALTER TABLE `distribution_deals`
  ADD COLUMN `market_mode` enum('sale','rent') DEFAULT NULL,
  ADD COLUMN `developer_projection_revision` varchar(80) DEFAULT NULL,
  ADD COLUMN `developer_projection_observed_at` timestamp NULL DEFAULT NULL,
  ADD COLUMN `referral_terms_snapshot_json` json DEFAULT NULL,
  ADD COLUMN `referral_terms_snapshot_digest` varchar(64) DEFAULT NULL;
