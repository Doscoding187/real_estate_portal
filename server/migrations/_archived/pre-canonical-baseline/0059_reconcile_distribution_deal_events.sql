CREATE TABLE IF NOT EXISTS `distribution_deal_events` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `deal_id` INT NOT NULL,
  `event_type` ENUM('stage_transition','override','validation','note','system') NOT NULL DEFAULT 'note',
  `from_stage` ENUM('viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled') NULL,
  `to_stage` ENUM('viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled') NULL,
  `actor_user_id` INT NULL,
  `owner_type` ENUM('agent','agency') NOT NULL DEFAULT 'agent',
  `owner_id` INT NULL,
  `assigned_agent_id` INT NULL,
  `visibility_scope` ENUM('private','team','agency') NOT NULL DEFAULT 'private',
  `metadata` JSON NULL,
  `notes` TEXT NULL,
  `event_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_distribution_deal_events_deal` (`deal_id`),
  KEY `idx_distribution_deal_events_event_at` (`event_at`),
  KEY `idx_distribution_deal_events_event_type` (`event_type`),
  CONSTRAINT `fk_distribution_deal_events_deal`
    FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_deal_events_actor_user`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_deal_events_assigned_agent`
    FOREIGN KEY (`assigned_agent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `event_type` ENUM('stage_transition','override','validation','note','system') NOT NULL DEFAULT 'note';

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `from_stage` ENUM('viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled') NULL;

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `to_stage` ENUM('viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled') NULL;

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `actor_user_id` INT NULL;

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `owner_type` ENUM('agent','agency') NOT NULL DEFAULT 'agent';

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `owner_id` INT NULL;

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `assigned_agent_id` INT NULL;

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `visibility_scope` ENUM('private','team','agency') NOT NULL DEFAULT 'private';

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `metadata` JSON NULL;

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `notes` TEXT NULL;

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `event_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE `distribution_deal_events`
  ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS `idx_distribution_deal_events_deal` ON `distribution_deal_events` (`deal_id`);
CREATE INDEX IF NOT EXISTS `idx_distribution_deal_events_event_at` ON `distribution_deal_events` (`event_at`);
CREATE INDEX IF NOT EXISTS `idx_distribution_deal_events_event_type` ON `distribution_deal_events` (`event_type`);
