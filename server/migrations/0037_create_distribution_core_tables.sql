-- Distribution network core tables required by later workflow/access/commission migrations.

CREATE TABLE IF NOT EXISTS `distribution_programs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `development_id` INT NOT NULL,
  `is_referral_enabled` TINYINT NOT NULL DEFAULT 0,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `commission_model` ENUM('flat_percentage','tiered_percentage','fixed_amount','hybrid') NOT NULL DEFAULT 'flat_percentage',
  `default_commission_percent` DECIMAL(5,2) NULL,
  `default_commission_amount` INT NULL,
  `referrer_commission_type` ENUM('flat','percentage') NULL,
  `referrer_commission_value` DECIMAL(12,2) NULL,
  `referrer_commission_basis` ENUM('sale_price','base_price') NULL,
  `platform_commission_type` ENUM('flat','percentage') NULL,
  `platform_commission_value` DECIMAL(12,2) NULL,
  `platform_commission_basis` ENUM('sale_price','base_price') NULL,
  `tier_access_policy` ENUM('open','restricted','invite_only') NOT NULL DEFAULT 'restricted',
  `payout_milestone` ENUM('attorney_instruction','attorney_signing','bond_approval','transfer_registration','occupation','custom') NOT NULL DEFAULT 'attorney_signing',
  `payout_milestone_notes` TEXT NULL,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  `created_by` INT NULL,
  `updated_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_program_development` (`development_id`),
  KEY `idx_distribution_programs_is_active` (`is_active`),
  KEY `idx_distribution_programs_referral_enabled` (`is_referral_enabled`),
  KEY `idx_distribution_programs_updated_at` (`updated_at`),
  CONSTRAINT `fk_distribution_programs_development`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_programs_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_programs_updated_by`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `affordability_assessments` (
  `id` VARCHAR(36) NOT NULL,
  `actor_user_id` INT NOT NULL,
  `subject_name` VARCHAR(200) NULL,
  `subject_phone` VARCHAR(50) NULL,
  `gross_income_monthly` INT NOT NULL,
  `deductions_monthly` INT NOT NULL DEFAULT 0,
  `deposit_amount` INT NOT NULL DEFAULT 0,
  `assumptions_json` JSON NOT NULL,
  `outputs_json` JSON NOT NULL,
  `location_filter_json` JSON NULL,
  `credit_check_consent_given` TINYINT NOT NULL DEFAULT 0,
  `credit_check_requested_at` TIMESTAMP NULL,
  `locked_at` TIMESTAMP NULL,
  `locked_by_deal_id` INT NULL,
  `locked_by_user_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_affordability_assessments_actor` (`actor_user_id`),
  KEY `idx_affordability_assessments_created_at` (`created_at`),
  KEY `idx_affordability_assessments_credit_check` (`credit_check_consent_given`),
  KEY `idx_affordability_assessments_locked_at` (`locked_at`),
  CONSTRAINT `fk_affordability_assessments_actor`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_affordability_assessments_locked_by_user`
    FOREIGN KEY (`locked_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `affordability_match_snapshots` (
  `id` VARCHAR(36) NOT NULL,
  `assessment_id` VARCHAR(36) NOT NULL,
  `matches_json` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_affordability_match_snapshots_assessment` (`assessment_id`),
  KEY `idx_affordability_match_snapshots_created_at` (`created_at`),
  CONSTRAINT `fk_affordability_match_snapshots_assessment`
    FOREIGN KEY (`assessment_id`) REFERENCES `affordability_assessments` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `distribution_agent_access` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `program_id` INT NOT NULL,
  `development_id` INT NOT NULL,
  `agent_id` INT NOT NULL,
  `min_tier_required` ENUM('tier_1','tier_2','tier_3','tier_4') NOT NULL DEFAULT 'tier_1',
  `access_status` ENUM('active','paused','revoked') NOT NULL DEFAULT 'active',
  `granted_by` INT NULL,
  `granted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` TIMESTAMP NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_agent_access_program_agent` (`program_id`, `agent_id`),
  KEY `idx_distribution_agent_access_agent` (`agent_id`),
  KEY `idx_distribution_agent_access_development` (`development_id`),
  KEY `idx_distribution_agent_access_status` (`access_status`),
  KEY `idx_distribution_agent_access_updated_at` (`updated_at`),
  CONSTRAINT `fk_distribution_agent_access_program`
    FOREIGN KEY (`program_id`) REFERENCES `distribution_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_agent_access_development`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_agent_access_agent`
    FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_agent_access_granted_by`
    FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `distribution_agent_tiers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `agent_id` INT NOT NULL,
  `tier` ENUM('tier_1','tier_2','tier_3','tier_4') NOT NULL,
  `score` INT NOT NULL DEFAULT 0,
  `window_days` INT NOT NULL DEFAULT 90,
  `reason` TEXT NULL,
  `effective_from` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `effective_to` TIMESTAMP NULL,
  `assigned_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_distribution_agent_tiers_agent` (`agent_id`),
  KEY `idx_distribution_agent_tiers_effective_to` (`effective_to`),
  KEY `idx_distribution_agent_tiers_tier` (`tier`),
  CONSTRAINT `fk_distribution_agent_tiers_agent`
    FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_agent_tiers_assigned_by`
    FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `distribution_deals` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `program_id` INT NOT NULL,
  `development_id` INT NOT NULL,
  `agent_id` INT NOT NULL,
  `owner_type` ENUM('agent','agency') NOT NULL DEFAULT 'agent',
  `owner_id` INT NULL,
  `assigned_agent_id` INT NULL,
  `visibility_scope` ENUM('private','team','agency') NOT NULL DEFAULT 'private',
  `manager_user_id` INT NULL,
  `affordability_assessment_id` VARCHAR(36) NULL,
  `affordability_match_snapshot_id` VARCHAR(36) NULL,
  `affordability_purchase_price` INT NULL,
  `affordability_assumptions_json` JSON NULL,
  `external_ref` VARCHAR(100) NULL,
  `buyer_name` VARCHAR(200) NOT NULL,
  `buyer_email` VARCHAR(320) NULL,
  `buyer_phone` VARCHAR(50) NULL,
  `deal_amount` INT NOT NULL DEFAULT 0,
  `platform_amount` INT NOT NULL DEFAULT 0,
  `commission_base_amount` INT NULL,
  `referrer_commission_type` ENUM('flat','percentage') NULL,
  `referrer_commission_value` DECIMAL(12,2) NULL,
  `referrer_commission_basis` ENUM('sale_price','base_price') NULL,
  `referrer_commission_amount` INT NULL,
  `platform_commission_type` ENUM('flat','percentage') NULL,
  `platform_commission_value` DECIMAL(12,2) NULL,
  `platform_commission_basis` ENUM('sale_price','base_price') NULL,
  `platform_commission_amount` INT NULL,
  `snapshot_version` INT NULL,
  `snapshot_source` ENUM('program_defaults','manual_override','system_recalculation') NULL,
  `current_stage` ENUM('viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled') NOT NULL DEFAULT 'viewing_scheduled',
  `commission_trigger_stage` ENUM('contract_signed','bond_approved') NOT NULL DEFAULT 'contract_signed',
  `commission_status` ENUM('not_ready','pending','approved','paid','cancelled') NOT NULL DEFAULT 'not_ready',
  `attribution_locked_at` TIMESTAMP NULL,
  `attribution_locked_by` INT NULL,
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_deal_external_ref` (`external_ref`),
  KEY `idx_distribution_deals_program` (`program_id`),
  KEY `idx_distribution_deals_development` (`development_id`),
  KEY `idx_distribution_deals_agent` (`agent_id`),
  KEY `idx_distribution_deals_manager` (`manager_user_id`),
  KEY `idx_distribution_deals_current_stage` (`current_stage`),
  KEY `idx_distribution_deals_commission_status` (`commission_status`),
  KEY `idx_distribution_deals_submitted_at` (`submitted_at`),
  KEY `idx_distribution_deals_owner` (`owner_type`, `owner_id`),
  KEY `idx_distribution_deals_assigned_agent` (`assigned_agent_id`),
  KEY `idx_distribution_deals_affordability_assessment` (`affordability_assessment_id`),
  KEY `idx_distribution_deals_affordability_snapshot` (`affordability_match_snapshot_id`),
  KEY `idx_distribution_deals_deal_amount` (`deal_amount`),
  KEY `idx_distribution_deals_platform_amount` (`platform_amount`),
  CONSTRAINT `fk_distribution_deals_program`
    FOREIGN KEY (`program_id`) REFERENCES `distribution_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_deals_development`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_deals_agent`
    FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_deals_assigned_agent`
    FOREIGN KEY (`assigned_agent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_deals_manager`
    FOREIGN KEY (`manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_deals_affordability_assessment`
    FOREIGN KEY (`affordability_assessment_id`) REFERENCES `affordability_assessments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_deals_affordability_snapshot`
    FOREIGN KEY (`affordability_match_snapshot_id`) REFERENCES `affordability_match_snapshots` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_deals_attribution_locked_by`
    FOREIGN KEY (`attribution_locked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
