CREATE TABLE IF NOT EXISTS `distribution_deal_events` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `deal_id` INT NOT NULL,
  `event_type` ENUM('stage_transition','override','validation','note','system') NOT NULL DEFAULT 'note',
  `from_stage` ENUM('viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled'),
  `to_stage` ENUM('viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled'),
  `actor_user_id` INT,
  `metadata` JSON,
  `notes` TEXT,
  `event_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_distribution_deal_events_deal` (`deal_id`),
  KEY `idx_distribution_deal_events_event_at` (`event_at`),
  KEY `idx_distribution_deal_events_event_type` (`event_type`),
  CONSTRAINT `fk_distribution_deal_events_deal` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_deal_events_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- DOWN (manual rollback, keep commented so runSqlMigrations.ts does not execute it)
-- DROP TABLE IF EXISTS `distribution_deal_events`;


