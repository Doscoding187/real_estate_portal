CREATE TABLE IF NOT EXISTS `distribution_programs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `development_id` int NOT NULL,
  `is_referral_enabled` tinyint NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `commission_model` ENUM('flat_percentage', 'tiered_percentage', 'fixed_amount', 'hybrid') NOT NULL DEFAULT 'flat_percentage',
  `default_commission_percent` decimal(5,2),
  `default_commission_amount` int,
  `referrer_commission_type` ENUM('flat', 'percentage'),
  `referrer_commission_value` decimal(12,2),
  `referrer_commission_basis` ENUM('sale_price', 'base_price'),
  `platform_commission_type` ENUM('flat', 'percentage'),
  `platform_commission_value` decimal(12,2),
  `platform_commission_basis` ENUM('sale_price', 'base_price'),
  `tier_access_policy` ENUM('open', 'restricted', 'invite_only') NOT NULL DEFAULT 'restricted',
  `payout_milestone` ENUM(
    'attorney_instruction',
    'attorney_signing',
    'bond_approval',
    'transfer_registration',
    'occupation',
    'custom'
  ) NOT NULL DEFAULT 'attorney_signing',
  `payout_milestone_notes` text,
  `currency_code` varchar(3) NOT NULL DEFAULT 'ZAR',
  `created_by` int,
  `updated_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_programs_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_program_development` UNIQUE (`development_id`),
  KEY `idx_distribution_programs_is_active` (`is_active`),
  KEY `idx_distribution_programs_referral_enabled` (`is_referral_enabled`),
  KEY `idx_distribution_programs_updated_at` (`updated_at`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `distribution_identities` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `identity_type` ENUM('referrer', 'manager') NOT NULL,
  `active` tinyint NOT NULL DEFAULT 1,
  `display_name` varchar(255),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_identities_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_identity_user_type` UNIQUE (`user_id`, `identity_type`),
  KEY `idx_distribution_identities_type_active` (`identity_type`, `active`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `distribution_agent_tiers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agent_id` int NOT NULL,
  `tier` ENUM('tier_1', 'tier_2', 'tier_3', 'tier_4') NOT NULL,
  `score` int NOT NULL DEFAULT 0,
  `window_days` int NOT NULL DEFAULT 90,
  `reason` text,
  `effective_from` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `effective_to` timestamp NULL,
  `assigned_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_agent_tiers_id_pk` PRIMARY KEY (`id`),
  KEY `idx_distribution_agent_tiers_agent` (`agent_id`),
  KEY `idx_distribution_agent_tiers_effective_to` (`effective_to`),
  KEY `idx_distribution_agent_tiers_tier` (`tier`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `distribution_agent_access` (
  `id` int AUTO_INCREMENT NOT NULL,
  `program_id` int NOT NULL,
  `development_id` int NOT NULL,
  `agent_id` int NOT NULL,
  `min_tier_required` ENUM('tier_1', 'tier_2', 'tier_3', 'tier_4') NOT NULL DEFAULT 'tier_1',
  `access_status` ENUM('active', 'paused', 'revoked') NOT NULL DEFAULT 'active',
  `granted_by` int,
  `granted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` timestamp NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_agent_access_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_agent_access_program_agent` UNIQUE (`program_id`, `agent_id`),
  KEY `idx_distribution_agent_access_agent` (`agent_id`),
  KEY `idx_distribution_agent_access_development` (`development_id`),
  KEY `idx_distribution_agent_access_status` (`access_status`),
  KEY `idx_distribution_agent_access_updated_at` (`updated_at`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `affordability_assessments` (
  `id` varchar(36) NOT NULL,
  `actor_user_id` int NOT NULL,
  `subject_name` varchar(200),
  `subject_phone` varchar(50),
  `gross_income_monthly` int NOT NULL,
  `deductions_monthly` int NOT NULL DEFAULT 0,
  `deposit_amount` int NOT NULL DEFAULT 0,
  `assumptions_json` json NOT NULL,
  `outputs_json` json NOT NULL,
  `location_filter_json` json,
  `credit_check_consent_given` tinyint NOT NULL DEFAULT 0,
  `credit_check_requested_at` timestamp NULL,
  `locked_at` timestamp NULL,
  `locked_by_deal_id` int NULL,
  `locked_by_user_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `affordability_assessments_id_pk` PRIMARY KEY (`id`),
  KEY `idx_affordability_assessments_actor` (`actor_user_id`),
  KEY `idx_affordability_assessments_created_at` (`created_at`),
  KEY `idx_affordability_assessments_credit_check` (`credit_check_consent_given`),
  KEY `idx_affordability_assessments_locked_at` (`locked_at`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `affordability_match_snapshots` (
  `id` varchar(36) NOT NULL,
  `assessment_id` varchar(36) NOT NULL,
  `matches_json` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `affordability_match_snapshots_id_pk` PRIMARY KEY (`id`),
  KEY `idx_affordability_match_snapshots_assessment` (`assessment_id`),
  KEY `idx_affordability_match_snapshots_created_at` (`created_at`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `qualification_pack_exports` (
  `id` varchar(36) NOT NULL,
  `assessment_id` varchar(36) NOT NULL,
  `match_snapshot_id` varchar(36) NOT NULL,
  `pdf_storage_key` varchar(500),
  `pdf_bytes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `qualification_pack_exports_id_pk` PRIMARY KEY (`id`),
  KEY `idx_qualification_pack_exports_assessment` (`assessment_id`),
  KEY `idx_qualification_pack_exports_snapshot` (`match_snapshot_id`),
  KEY `idx_qualification_pack_exports_created_at` (`created_at`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `distribution_deals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `program_id` int NOT NULL,
  `development_id` int NOT NULL,
  `agent_id` int NOT NULL,
  `owner_type` ENUM('agent', 'agency') NOT NULL DEFAULT 'agent',
  `owner_id` int,
  `assigned_agent_id` int,
  `visibility_scope` ENUM('private', 'team', 'agency') NOT NULL DEFAULT 'private',
  `manager_user_id` int,
  `affordability_assessment_id` varchar(36),
  `affordability_match_snapshot_id` varchar(36),
  `affordability_purchase_price` int,
  `affordability_assumptions_json` json,
  `external_ref` varchar(100),
  `buyer_name` varchar(200) NOT NULL,
  `buyer_email` varchar(320),
  `buyer_phone` varchar(50),
  `deal_amount` int NOT NULL DEFAULT 0,
  `platform_amount` int NOT NULL DEFAULT 0,
  `commission_base_amount` int,
  `referrer_commission_type` ENUM('flat', 'percentage'),
  `referrer_commission_value` decimal(12,2),
  `referrer_commission_basis` ENUM('sale_price', 'base_price'),
  `referrer_commission_amount` int,
  `platform_commission_type` ENUM('flat', 'percentage'),
  `platform_commission_value` decimal(12,2),
  `platform_commission_basis` ENUM('sale_price', 'base_price'),
  `platform_commission_amount` int,
  `snapshot_version` int,
  `snapshot_source` ENUM('submission_gate', 'backfill', 'override'),
  `current_stage` ENUM(
    'viewing_scheduled',
    'viewing_completed',
    'application_submitted',
    'contract_signed',
    'bond_approved',
    'commission_pending',
    'commission_paid',
    'cancelled'
  ) NOT NULL DEFAULT 'viewing_scheduled',
  `commission_trigger_stage` ENUM('contract_signed', 'bond_approved') NOT NULL DEFAULT 'contract_signed',
  `commission_status` ENUM('not_ready', 'pending', 'approved', 'paid', 'cancelled') NOT NULL DEFAULT 'not_ready',
  `status` ENUM('submitted', 'in_review', 'docs_pending', 'docs_verified', 'rejected', 'payout_ready', 'closed') NOT NULL DEFAULT 'submitted',
  `submitted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` timestamp NULL,
  `attribution_locked_at` timestamp NULL,
  `attribution_locked_by` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_deals_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_deal_external_ref` UNIQUE (`external_ref`),
  KEY `idx_distribution_deals_program` (`program_id`),
  KEY `idx_distribution_deals_development` (`development_id`),
  KEY `idx_distribution_deals_agent` (`agent_id`),
  KEY `idx_distribution_deals_manager` (`manager_user_id`),
  KEY `idx_distribution_deals_current_stage` (`current_stage`),
  KEY `idx_distribution_deals_commission_status` (`commission_status`),
  KEY `idx_distribution_deals_submitted_at` (`submitted_at`),
  KEY `idx_distribution_deals_assigned_agent` (`assigned_agent_id`),
  KEY `idx_distribution_deals_owner` (`owner_type`, `owner_id`),
  KEY `idx_distribution_deals_affordability_assessment` (`affordability_assessment_id`),
  KEY `idx_distribution_deals_affordability_snapshot` (`affordability_match_snapshot_id`),
  KEY `idx_distribution_deals_deal_amount` (`deal_amount`),
  KEY `idx_distribution_deals_platform_amount` (`platform_amount`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `distribution_deal_documents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `deal_id` int NOT NULL,
  `development_required_document_id` int NOT NULL,
  `status` ENUM('pending', 'received', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  `received_at` timestamp NULL,
  `verified_at` timestamp NULL,
  `received_by` int NULL,
  `verified_by` int NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_deal_documents_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_deal_documents_required_document`
    UNIQUE(`deal_id`, `development_required_document_id`),
  KEY `idx_distribution_deal_documents_deal` (`deal_id`),
  KEY `idx_distribution_deal_documents_required_document` (`development_required_document_id`),
  KEY `idx_distribution_deal_documents_status` (`status`),
  KEY `idx_distribution_deal_documents_updated_at` (`updated_at`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `distribution_deal_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `deal_id` int NOT NULL,
  `event_type` ENUM('stage_transition', 'override', 'validation', 'note', 'system') NOT NULL DEFAULT 'note',
  `from_stage` ENUM(
    'viewing_scheduled',
    'viewing_completed',
    'application_submitted',
    'contract_signed',
    'bond_approved',
    'commission_pending',
    'commission_paid',
    'cancelled'
  ),
  `to_stage` ENUM(
    'viewing_scheduled',
    'viewing_completed',
    'application_submitted',
    'contract_signed',
    'bond_approved',
    'commission_pending',
    'commission_paid',
    'cancelled'
  ),
  `actor_user_id` int,
  `owner_type` ENUM('agent', 'agency') NOT NULL DEFAULT 'agent',
  `owner_id` int,
  `assigned_agent_id` int,
  `visibility_scope` ENUM('private', 'team', 'agency') NOT NULL DEFAULT 'private',
  `metadata` json,
  `notes` text,
  `event_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_deal_events_id_pk` PRIMARY KEY (`id`),
  KEY `idx_distribution_deal_events_deal` (`deal_id`),
  KEY `idx_distribution_deal_events_event_at` (`event_at`),
  KEY `idx_distribution_deal_events_event_type` (`event_type`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `distribution_referrer_applications` (
  `id` int AUTO_INCREMENT NOT NULL,
  `requested_identity` ENUM('referrer', 'manager') NOT NULL DEFAULT 'referrer',
  `full_name` varchar(200) NOT NULL,
  `email` varchar(320) NOT NULL,
  `phone` varchar(50),
  `notes` text,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `user_id` int,
  `reviewed_by` int,
  `reviewed_at` timestamp NULL,
  `review_notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_referrer_applications_id_pk` PRIMARY KEY (`id`),
  KEY `idx_distribution_referrer_applications_email` (`email`),
  KEY `idx_distribution_referrer_applications_status` (`status`),
  KEY `idx_distribution_referrer_applications_created` (`created_at`)
);
