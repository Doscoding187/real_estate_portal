ALTER TABLE `plans`
  ADD COLUMN `segment` enum('agent','agency','enterprise','developer') NOT NULL DEFAULT 'agent' AFTER `description`;

ALTER TABLE `plans`
  ADD COLUMN `price_monthly` int NOT NULL DEFAULT 0 AFTER `price`;

ALTER TABLE `plans`
  ADD COLUMN `trial_days` int NOT NULL DEFAULT 14 AFTER `interval`;

ALTER TABLE `plans`
  ADD COLUMN `metadata` json NULL AFTER `trial_days`;

CREATE TABLE IF NOT EXISTS `plan_entitlements` (
  `id` int AUTO_INCREMENT NOT NULL,
  `plan_id` int NOT NULL,
  `feature_key` varchar(120) NOT NULL,
  `value_json` json NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_plan_entitlements_plan_feature` (`plan_id`, `feature_key`),
  KEY `idx_plan_entitlements_plan` (`plan_id`),
  CONSTRAINT `plan_entitlements_plan_id_plans_id_fk`
    FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `owner_type` enum('agent','agency') NOT NULL,
  `owner_id` int NOT NULL,
  `plan_id` int NULL,
  `status` enum('trial','active','expired','cancelled') NOT NULL DEFAULT 'trial',
  `trial_ends_at` timestamp NULL,
  `billing_cycle_anchor` timestamp NULL,
  `metadata` json NULL,
  `created_by` int NULL,
  `updated_by` int NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subscriptions_owner` (`owner_type`, `owner_id`),
  KEY `idx_subscriptions_owner` (`owner_type`, `owner_id`),
  KEY `idx_subscriptions_status` (`status`),
  KEY `idx_subscriptions_plan` (`plan_id`),
  CONSTRAINT `subscriptions_plan_id_plans_id_fk`
    FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE SET NULL,
  CONSTRAINT `subscriptions_created_by_users_id_fk`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `subscriptions_updated_by_users_id_fk`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

ALTER TABLE `lead_activities`
  ADD COLUMN `userId` int NULL AFTER `leadId`;

ALTER TABLE `lead_activities`
  ADD COLUMN `type` enum('note','call','email','meeting','status_change') NULL AFTER `userId`;

SET @lead_activities_has_activity_type = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'lead_activities'
    AND column_name = 'activityType'
);

SET @lead_activities_backfill_sql = IF(
  @lead_activities_has_activity_type > 0,
  'UPDATE `lead_activities` SET `type` = CASE WHEN `activityType` IN (''note'', ''call'', ''email'', ''meeting'', ''status_change'') THEN `activityType` ELSE ''note'' END WHERE `type` IS NULL',
  'UPDATE `lead_activities` SET `type` = COALESCE(`type`, ''note'') WHERE `type` IS NULL'
);

PREPARE lead_activities_backfill FROM @lead_activities_backfill_sql;

EXECUTE lead_activities_backfill;

DEALLOCATE PREPARE lead_activities_backfill;

ALTER TABLE `lead_activities`
  MODIFY COLUMN `type` enum('note','call','email','meeting','status_change') NOT NULL;

CREATE INDEX `idx_lead_activities_user` ON `lead_activities` (`userId`);

ALTER TABLE `lead_activities`
  ADD CONSTRAINT `lead_activities_userId_users_id_fk`
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL;
