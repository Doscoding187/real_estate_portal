CREATE TABLE IF NOT EXISTS `distribution_viewings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `deal_id` int NOT NULL,
  `program_id` int NOT NULL,
  `development_id` int NOT NULL,
  `agent_id` int NOT NULL,
  `manager_user_id` int NOT NULL,
  `scheduled_start_at` timestamp NOT NULL,
  `scheduled_end_at` timestamp NULL DEFAULT NULL,
  `timezone` varchar(64) NOT NULL DEFAULT 'Africa/Johannesburg',
  `location_name` varchar(255) DEFAULT NULL,
  `status` enum('scheduled','completed','no_show','cancelled') NOT NULL DEFAULT 'scheduled',
  `reschedule_count` int NOT NULL DEFAULT 0,
  `scheduled_by_user_id` int DEFAULT NULL,
  `last_rescheduled_by` int DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_viewings_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_viewings_deal` UNIQUE (`deal_id`),
  CONSTRAINT `distribution_viewings_deal_id_fk`
    FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_viewings_program_id_fk`
    FOREIGN KEY (`program_id`) REFERENCES `distribution_programs`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_viewings_development_id_fk`
    FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_viewings_agent_id_fk`
    FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_viewings_manager_user_id_fk`
    FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_viewings_scheduled_by_user_id_fk`
    FOREIGN KEY (`scheduled_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null,
  CONSTRAINT `distribution_viewings_last_rescheduled_by_fk`
    FOREIGN KEY (`last_rescheduled_by`) REFERENCES `users`(`id`) ON DELETE set null,
  KEY `idx_distribution_viewings_program` (`program_id`),
  KEY `idx_distribution_viewings_development` (`development_id`),
  KEY `idx_distribution_viewings_agent` (`agent_id`),
  KEY `idx_distribution_viewings_manager` (`manager_user_id`),
  KEY `idx_distribution_viewings_start` (`scheduled_start_at`),
  KEY `idx_distribution_viewings_status` (`status`)
);

CREATE TABLE IF NOT EXISTS `distribution_viewing_validations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `deal_id` int NOT NULL,
  `development_id` int NOT NULL,
  `manager_user_id` int NOT NULL,
  `agent_id` int NOT NULL,
  `validation_status` enum('pending','completed_proceeding','completed_not_proceeding','no_show','cancelled') NOT NULL DEFAULT 'pending',
  `attribution_lock_applied` tinyint NOT NULL DEFAULT 0,
  `attribution_lock_at` timestamp NULL DEFAULT NULL,
  `validated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_viewing_validations_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `distribution_viewing_validations_deal_id_fk`
    FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_viewing_validations_development_id_fk`
    FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_viewing_validations_manager_user_id_fk`
    FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_viewing_validations_agent_id_fk`
    FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  KEY `idx_distribution_viewing_validations_deal` (`deal_id`),
  KEY `idx_distribution_viewing_validations_status` (`validation_status`),
  KEY `idx_distribution_viewing_validations_validated_at` (`validated_at`)
);

CREATE TABLE IF NOT EXISTS `distribution_commission_entries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `deal_id` int NOT NULL,
  `program_id` int NOT NULL,
  `development_id` int NOT NULL,
  `agent_id` int NOT NULL,
  `calculation_base_amount` int NOT NULL DEFAULT 0,
  `commission_percent` decimal(5,2) DEFAULT NULL,
  `commission_amount` int NOT NULL DEFAULT 0,
  `currency` varchar(10) NOT NULL DEFAULT 'ZAR',
  `trigger_stage` enum('contract_signed','bond_approved') NOT NULL,
  `entry_status` enum('pending','approved','paid','cancelled') NOT NULL DEFAULT 'pending',
  `approved_at` timestamp NULL DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `paid_by` int DEFAULT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_commission_entries_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_commission_entry_deal_trigger` UNIQUE (`deal_id`, `trigger_stage`),
  CONSTRAINT `distribution_commission_entries_deal_id_fk`
    FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_commission_entries_program_id_fk`
    FOREIGN KEY (`program_id`) REFERENCES `distribution_programs`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_commission_entries_development_id_fk`
    FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_commission_entries_agent_id_fk`
    FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_commission_entries_approved_by_fk`
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null,
  CONSTRAINT `distribution_commission_entries_paid_by_fk`
    FOREIGN KEY (`paid_by`) REFERENCES `users`(`id`) ON DELETE set null,
  CONSTRAINT `distribution_commission_entries_created_by_fk`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null,
  CONSTRAINT `distribution_commission_entries_updated_by_fk`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null,
  KEY `idx_distribution_commission_entries_program` (`program_id`),
  KEY `idx_distribution_commission_entries_development` (`development_id`),
  KEY `idx_distribution_commission_entries_agent` (`agent_id`),
  KEY `idx_distribution_commission_entries_status` (`entry_status`),
  KEY `idx_distribution_commission_entries_updated_at` (`updated_at`)
);

CREATE TABLE IF NOT EXISTS `distribution_commission_ledger` (
  `id` int AUTO_INCREMENT NOT NULL,
  `distribution_deal_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `role` enum('referrer','manager','platform','override') NOT NULL,
  `percentage` decimal(7,4) DEFAULT NULL,
  `calculated_amount` int NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'ZAR',
  `calculation_hash` varchar(64) NOT NULL,
  `calculation_input` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_commission_ledger_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_commission_ledger_hash` UNIQUE (`calculation_hash`),
  CONSTRAINT `distribution_commission_ledger_distribution_deal_id_fk`
    FOREIGN KEY (`distribution_deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_commission_ledger_recipient_id_fk`
    FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  KEY `idx_distribution_commission_ledger_deal` (`distribution_deal_id`),
  KEY `idx_distribution_commission_ledger_recipient` (`recipient_id`),
  KEY `idx_distribution_commission_ledger_role` (`role`),
  KEY `idx_distribution_commission_ledger_created_at` (`created_at`)
);

CREATE TABLE IF NOT EXISTS `distribution_commission_overrides` (
  `id` int AUTO_INCREMENT NOT NULL,
  `deal_id` int NOT NULL,
  `actor_user_id` int NOT NULL,
  `reason` text NOT NULL,
  `previous_snapshot` json NOT NULL,
  `next_snapshot` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_commission_overrides_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `distribution_commission_overrides_deal_id_fk`
    FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_commission_overrides_actor_user_id_fk`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  KEY `idx_distribution_commission_overrides_deal` (`deal_id`),
  KEY `idx_distribution_commission_overrides_actor` (`actor_user_id`),
  KEY `idx_distribution_commission_overrides_created_at` (`created_at`)
);
