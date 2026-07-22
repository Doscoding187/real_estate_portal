CREATE TABLE IF NOT EXISTS `agency_deals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `lead_id` int NULL,
  `listing_id` int NULL,
  `property_id` int NULL,
  `source_viewing_id` int NULL,
  `responsible_agent_id` int NULL,
  `transaction_type` enum('sale','rental') NOT NULL DEFAULT 'sale',
  `stage` enum('interest','draft_offer','submitted','under_review','negotiation','accepted','transaction_open','transaction_progression','completed','cancelled') NOT NULL DEFAULT 'interest',
  `interest_status` enum('interested','maybe_nurture','not_interested','wants_offer','wants_another_viewing','needs_finance','needs_to_sell') NOT NULL DEFAULT 'interested',
  `risk_status` enum('on_track','watch','at_risk','blocked','complete','cancelled') NOT NULL DEFAULT 'on_track',
  `accepted_offer_version_id` int NULL,
  `accepted_amount` decimal(15,2) NULL,
  `accepted_at` timestamp NULL,
  `next_action` varchar(255) NULL,
  `next_deadline` timestamp NULL,
  `created_by_user_id` int NULL,
  `updated_by_user_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_agency_deals_agency_stage` (`agency_id`, `stage`),
  KEY `idx_agency_deals_lead` (`lead_id`),
  KEY `idx_agency_deals_listing` (`listing_id`),
  KEY `idx_agency_deals_viewing` (`source_viewing_id`),
  KEY `idx_agency_deals_deadline` (`agency_id`, `next_deadline`),
  CONSTRAINT `agency_deals_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_deals_lead_id_fk`
    FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_deals_listing_id_fk`
    FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_deals_property_id_fk`
    FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_deals_source_viewing_id_fk`
    FOREIGN KEY (`source_viewing_id`) REFERENCES `showings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_deals_responsible_agent_id_fk`
    FOREIGN KEY (`responsible_agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_deals_created_by_user_id_fk`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_deals_updated_by_user_id_fk`
    FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `agency_deal_offer_versions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `deal_id` int NOT NULL,
  `parent_offer_version_id` int NULL,
  `version_number` int NOT NULL,
  `actor` enum('buyer','seller','landlord','tenant','agency') NOT NULL DEFAULT 'buyer',
  `event_type` enum('initial_offer','seller_counter','buyer_counter','landlord_counter','tenant_counter','acceptance_note') NOT NULL DEFAULT 'initial_offer',
  `status` enum('draft','submitted','under_review','countered','accepted','rejected','withdrawn','expired','superseded') NOT NULL DEFAULT 'draft',
  `amount` decimal(15,2) NOT NULL,
  `deposit_amount` decimal(15,2) NULL,
  `finance_required` tinyint NOT NULL DEFAULT 0,
  `bond_amount` decimal(15,2) NULL,
  `cash_portion` decimal(15,2) NULL,
  `occupation_date` date NULL,
  `occupational_rent` decimal(15,2) NULL,
  `monthly_rental` decimal(15,2) NULL,
  `lease_duration_months` int NULL,
  `rental_deposit` decimal(15,2) NULL,
  `offer_expiry` timestamp NULL,
  `conditions_summary` text NULL,
  `fixtures_summary` text NULL,
  `special_conditions` text NULL,
  `terms_snapshot` json NULL,
  `submitted_at` timestamp NULL,
  `decided_at` timestamp NULL,
  `created_by_user_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agency_deal_offer_version` (`deal_id`, `version_number`),
  KEY `idx_agency_offer_agency_status` (`agency_id`, `status`),
  KEY `idx_agency_offer_deal` (`deal_id`),
  KEY `idx_agency_offer_expiry` (`agency_id`, `offer_expiry`),
  CONSTRAINT `agency_offer_versions_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_offer_versions_deal_id_fk`
    FOREIGN KEY (`deal_id`) REFERENCES `agency_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_offer_versions_created_by_user_id_fk`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `agency_transactions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `deal_id` int NOT NULL,
  `lead_id` int NULL,
  `listing_id` int NULL,
  `property_id` int NULL,
  `responsible_agent_id` int NULL,
  `accepted_offer_version_id` int NOT NULL,
  `transaction_type` enum('sale','rental') NOT NULL DEFAULT 'sale',
  `status` enum('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
  `stage` varchar(80) NOT NULL,
  `risk_status` enum('on_track','watch','at_risk','blocked','complete','cancelled') NOT NULL DEFAULT 'watch',
  `accepted_amount` decimal(15,2) NOT NULL,
  `accepted_terms_snapshot` json NULL,
  `opened_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `target_completion_date` timestamp NULL,
  `completed_at` timestamp NULL,
  `cancelled_at` timestamp NULL,
  `next_action` varchar(255) NULL,
  `next_deadline` timestamp NULL,
  `transfer_duty_vat_treatment` enum('unknown','transfer_duty','vat','exempt','not_applicable') NOT NULL DEFAULT 'unknown',
  `commission_basis` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `commission_percentage` decimal(5,2) NOT NULL DEFAULT 5.00,
  `commission_fixed_amount` decimal(15,2) NULL,
  `commission_vat_treatment` enum('inclusive','exclusive','not_applicable') NOT NULL DEFAULT 'exclusive',
  `gross_commission` decimal(15,2) NOT NULL,
  `agency_share` decimal(15,2) NOT NULL,
  `agent_share` decimal(15,2) NOT NULL,
  `referral_split` decimal(15,2) NOT NULL DEFAULT 0.00,
  `other_deductions` decimal(15,2) NOT NULL DEFAULT 0.00,
  `expected_commission` decimal(15,2) NOT NULL,
  `commission_status` enum('estimated','payable','paid','cancelled') NOT NULL DEFAULT 'estimated',
  `expected_payment_date` timestamp NULL,
  `paid_date` timestamp NULL,
  `created_by_user_id` int NULL,
  `updated_by_user_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agency_transactions_deal` (`deal_id`),
  KEY `idx_agency_transactions_agency_status` (`agency_id`, `status`),
  KEY `idx_agency_transactions_deadline` (`agency_id`, `next_deadline`),
  KEY `idx_agency_transactions_commission` (`agency_id`, `commission_status`),
  CONSTRAINT `agency_transactions_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_transactions_deal_id_fk`
    FOREIGN KEY (`deal_id`) REFERENCES `agency_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_transactions_lead_id_fk`
    FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_transactions_listing_id_fk`
    FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_transactions_property_id_fk`
    FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_transactions_responsible_agent_id_fk`
    FOREIGN KEY (`responsible_agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_transactions_offer_version_id_fk`
    FOREIGN KEY (`accepted_offer_version_id`) REFERENCES `agency_deal_offer_versions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `agency_transactions_created_by_user_id_fk`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_transactions_updated_by_user_id_fk`
    FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `agency_transaction_milestones` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `transaction_id` int NOT NULL,
  `sequence` int NOT NULL,
  `milestone_key` varchar(80) NOT NULL,
  `title` varchar(180) NOT NULL,
  `responsible_party` enum('agency','buyer','seller','tenant','landlord','conveyancer','bond_originator','attorney','service_provider','other') NOT NULL DEFAULT 'agency',
  `due_at` timestamp NULL,
  `status` enum('pending','in_progress','completed','waived','cancelled','blocked') NOT NULL DEFAULT 'pending',
  `completed_at` timestamp NULL,
  `notes` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agency_tx_milestone_key` (`transaction_id`, `milestone_key`),
  KEY `idx_agency_tx_milestone_due` (`agency_id`, `due_at`),
  KEY `idx_agency_tx_milestone_status` (`agency_id`, `status`),
  CONSTRAINT `agency_tx_milestones_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_tx_milestones_transaction_id_fk`
    FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `agency_transaction_conditions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `transaction_id` int NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text NULL,
  `responsible_party` enum('agency','buyer','seller','tenant','landlord','conveyancer','bond_originator','attorney','service_provider','other') NOT NULL DEFAULT 'agency',
  `due_at` timestamp NULL,
  `status` enum('pending','in_progress','completed','waived','cancelled','blocked') NOT NULL DEFAULT 'pending',
  `evidence_document_id` int NULL,
  `completed_at` timestamp NULL,
  `waived_or_cancelled_reason` text NULL,
  `notes` text NULL,
  `created_by_user_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_agency_tx_conditions_due` (`agency_id`, `due_at`),
  KEY `idx_agency_tx_conditions_status` (`agency_id`, `status`),
  KEY `idx_agency_tx_conditions_tx` (`transaction_id`),
  CONSTRAINT `agency_tx_conditions_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_tx_conditions_transaction_id_fk`
    FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_tx_conditions_created_by_user_id_fk`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `agency_transaction_parties` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `transaction_id` int NOT NULL,
  `role` enum('buyer','tenant','seller','landlord','listing_agent','buyer_agent','agency_manager','bond_originator','conveyancer','bond_attorney','cancellation_attorney','inspector','managing_agent','service_provider','other') NOT NULL,
  `name` varchar(200) NOT NULL,
  `email` varchar(320) NULL,
  `phone` varchar(50) NULL,
  `organization` varchar(200) NULL,
  `user_id` int NULL,
  `agent_id` int NULL,
  `notes` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_agency_tx_parties_tx` (`transaction_id`),
  KEY `idx_agency_tx_parties_role` (`agency_id`, `role`),
  CONSTRAINT `agency_tx_parties_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_tx_parties_transaction_id_fk`
    FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_tx_parties_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_tx_parties_agent_id_fk`
    FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `agency_transaction_documents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `transaction_id` int NOT NULL,
  `condition_id` int NULL,
  `document_type` enum('signed_offer','id_document','proof_of_address','proof_of_funds','prequalification','bond_approval','fica','mandate','compliance_certificate','lease','inspection','other') NOT NULL,
  `status` enum('requested','uploaded','verified','rejected','waived') NOT NULL DEFAULT 'uploaded',
  `file_name` varchar(255) NOT NULL,
  `storage_key` varchar(500) NOT NULL,
  `content_type` varchar(120) NULL,
  `file_size` int NULL,
  `visibility_scope` enum('agency_private') NOT NULL DEFAULT 'agency_private',
  `uploaded_by_user_id` int NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agency_tx_doc_storage` (`storage_key`),
  KEY `idx_agency_tx_docs_tx` (`transaction_id`),
  KEY `idx_agency_tx_docs_type` (`agency_id`, `document_type`),
  CONSTRAINT `agency_tx_docs_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_tx_docs_transaction_id_fk`
    FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_tx_docs_condition_id_fk`
    FOREIGN KEY (`condition_id`) REFERENCES `agency_transaction_conditions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `agency_tx_docs_uploaded_by_user_id_fk`
    FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `agency_transaction_activity` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `transaction_id` int NOT NULL,
  `actor_user_id` int NULL,
  `event_type` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `metadata` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_agency_tx_activity_tx` (`transaction_id`),
  KEY `idx_agency_tx_activity_created` (`agency_id`, `created_at`),
  CONSTRAINT `agency_tx_activity_agency_id_fk`
    FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_tx_activity_transaction_id_fk`
    FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agency_tx_activity_actor_user_id_fk`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
