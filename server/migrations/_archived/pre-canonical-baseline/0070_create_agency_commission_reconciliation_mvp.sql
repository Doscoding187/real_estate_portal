CREATE TABLE IF NOT EXISTS `agency_commission_settlements` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `transaction_id` int NOT NULL,
  `responsible_agent_id` int NULL,
  `expected_commission` decimal(15,2) NOT NULL,
  `agent_share` decimal(15,2) NOT NULL,
  `agency_share` decimal(15,2) NOT NULL,
  `expected_payment_date` timestamp NULL,
  `status` enum('forecast','awaiting_completion','awaiting_payment','partially_received','received','reconciliation_required','disputed','cancelled') NOT NULL DEFAULT 'forecast',
  `variance_reason` text NULL,
  `approved_by_user_id` int NULL,
  `approved_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agency_commission_settlement_transaction` (`transaction_id`),
  KEY `idx_agency_commission_settlement_status` (`agency_id`, `status`),
  KEY `idx_agency_commission_settlement_agent` (`agency_id`, `responsible_agent_id`),
  KEY `idx_agency_commission_settlement_expected_date` (`agency_id`, `expected_payment_date`),
  CONSTRAINT `agency_commission_settlement_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_commission_settlement_transaction_id_fk`
    FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_commission_settlement_agent_id_fk`
    FOREIGN KEY (`responsible_agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_commission_settlement_approved_by_fk`
    FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `agency_commission_settlement_payments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `settlement_id` int NOT NULL,
  `amount_received` decimal(15,2) NOT NULL,
  `received_at` timestamp NOT NULL,
  `reference` varchar(160) NULL,
  `note` text NULL,
  `recorded_by_user_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_agency_commission_payment_settlement` (`agency_id`, `settlement_id`),
  KEY `idx_agency_commission_payment_received_at` (`agency_id`, `received_at`),
  CONSTRAINT `agency_commission_payment_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_commission_payment_settlement_id_fk`
    FOREIGN KEY (`settlement_id`) REFERENCES `agency_commission_settlements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_commission_payment_recorded_by_fk`
    FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
