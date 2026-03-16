CREATE TABLE IF NOT EXISTS `distribution_commission_ledger` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `distribution_deal_id` INT NOT NULL,
  `recipient_id` INT NOT NULL,
  `role` ENUM('referrer','manager','platform','override') NOT NULL,
  `percentage` DECIMAL(7,4),
  `calculated_amount` INT NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'ZAR',
  `calculation_hash` VARCHAR(64) NOT NULL,
  `calculation_input` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_commission_ledger_hash` (`calculation_hash`),
  KEY `idx_distribution_commission_ledger_deal` (`distribution_deal_id`),
  KEY `idx_distribution_commission_ledger_recipient` (`recipient_id`),
  KEY `idx_distribution_commission_ledger_role` (`role`),
  KEY `idx_distribution_commission_ledger_created_at` (`created_at`),
  CONSTRAINT `fk_distribution_commission_ledger_deal` FOREIGN KEY (`distribution_deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_commission_ledger_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS `trg_distribution_commission_ledger_no_update`;
CREATE TRIGGER `trg_distribution_commission_ledger_no_update`
BEFORE UPDATE ON `distribution_commission_ledger`
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'distribution_commission_ledger is append-only updates are not allowed';

DROP TRIGGER IF EXISTS `trg_distribution_commission_ledger_no_delete`;
CREATE TRIGGER `trg_distribution_commission_ledger_no_delete`
BEFORE DELETE ON `distribution_commission_ledger`
FOR EACH ROW
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'distribution_commission_ledger is append-only deletes are not allowed';

-- DOWN (manual rollback only)
-- DROP TRIGGER IF EXISTS `trg_distribution_commission_ledger_no_delete`;
-- DROP TRIGGER IF EXISTS `trg_distribution_commission_ledger_no_update`;
-- DROP TABLE IF EXISTS `distribution_commission_ledger`;
