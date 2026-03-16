-- Add persisted confidence level tiers for assessment explainability.

ALTER TABLE `referral_assessments`
  ADD COLUMN `confidence_level` ENUM('low', 'medium', 'high', 'verified') NOT NULL DEFAULT 'low'
  AFTER `confidence_score`;

ALTER TABLE `referral_assessments`
  ADD INDEX `idx_referral_assessments_confidence_level` (`confidence_level`);
