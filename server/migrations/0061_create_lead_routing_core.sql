CREATE TABLE IF NOT EXISTS `lead_campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(160) NOT NULL,
  `title` varchar(255) NOT NULL,
  `status` enum('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
  `accepted_source_types` json,
  `target_areas` json,
  `promoted_development_ids` json,
  `campaign_priority` int NOT NULL DEFAULT 0,
  `config_json` json,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_lead_campaigns_slug` (`slug`),
  KEY `idx_lead_campaigns_status` (`status`),
  KEY `idx_lead_campaigns_priority` (`campaign_priority`),
  KEY `idx_lead_campaigns_created_by` (`created_by`),
  CONSTRAINT `lead_campaigns_created_by_users_id_fk`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `lead_funnel_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaign_id` int,
  `session_token` varchar(96) NOT NULL,
  `source_type` enum('meta_ads','google_ads','organic','whatsapp','linkedin_ads','direct','internal_explore','manual') NOT NULL DEFAULT 'direct',
  `status` enum('active','converted','abandoned','duplicate') NOT NULL DEFAULT 'active',
  `utm_source` varchar(100),
  `utm_medium` varchar(100),
  `utm_campaign` varchar(150),
  `utm_content` varchar(150),
  `utm_term` varchar(150),
  `fbclid` varchar(255),
  `gclid` varchar(255),
  `referrer_url` varchar(2048),
  `landing_page_url` varchar(2048),
  `metadata` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `converted_at` timestamp NULL,
  `expires_at` timestamp NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_lead_funnel_sessions_token` (`session_token`),
  KEY `idx_lead_funnel_sessions_campaign` (`campaign_id`),
  KEY `idx_lead_funnel_sessions_source` (`source_type`),
  KEY `idx_lead_funnel_sessions_status` (`status`),
  KEY `idx_lead_funnel_sessions_created` (`created_at`),
  CONSTRAINT `lead_funnel_sessions_campaign_id_lead_campaigns_id_fk`
    FOREIGN KEY (`campaign_id`) REFERENCES `lead_campaigns` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `buyer_leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int,
  `campaign_id` int,
  `platform_lead_id` int,
  `source_type` enum('meta_ads','google_ads','organic','whatsapp','linkedin_ads','direct','internal_explore','manual') NOT NULL DEFAULT 'direct',
  `status` enum('new','qualified_light','needs_review','contacted','viewing_booked','application_started','application_submitted','deal_created','lost','duplicate') NOT NULL DEFAULT 'new',
  `full_name` varchar(200) NOT NULL,
  `phone` varchar(50),
  `normalized_phone` varchar(50),
  `email` varchar(320),
  `normalized_email` varchar(320),
  `preferred_contact_method` enum('phone','whatsapp','email','any') NOT NULL DEFAULT 'any',
  `contact_permission` tinyint NOT NULL DEFAULT 0,
  `marketing_consent` tinyint NOT NULL DEFAULT 0,
  `consent_timestamp` timestamp NULL,
  `privacy_policy_version` varchar(40),
  `duplicate_of_lead_id` int,
  `duplicate_reason` text,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_buyer_leads_session` (`session_id`),
  KEY `idx_buyer_leads_campaign` (`campaign_id`),
  KEY `idx_buyer_leads_platform_lead` (`platform_lead_id`),
  KEY `idx_buyer_leads_source` (`source_type`),
  KEY `idx_buyer_leads_status` (`status`),
  KEY `idx_buyer_leads_phone` (`normalized_phone`),
  KEY `idx_buyer_leads_email` (`normalized_email`),
  KEY `idx_buyer_leads_duplicate` (`duplicate_of_lead_id`),
  KEY `idx_buyer_leads_created` (`created_at`),
  CONSTRAINT `buyer_leads_session_id_lead_funnel_sessions_id_fk`
    FOREIGN KEY (`session_id`) REFERENCES `lead_funnel_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `buyer_leads_campaign_id_lead_campaigns_id_fk`
    FOREIGN KEY (`campaign_id`) REFERENCES `lead_campaigns` (`id`) ON DELETE SET NULL,
  CONSTRAINT `buyer_leads_platform_lead_id_leads_id_fk`
    FOREIGN KEY (`platform_lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `buyer_qualification_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int,
  `buyer_lead_id` int,
  `gross_monthly_income` int,
  `gross_monthly_income_range` varchar(80),
  `co_applicant_income` int,
  `employment_type` enum('permanently_employed','self_employed','business_owner','contract_worker','government_employee','not_currently_employed','other'),
  `buying_mode` enum('solo','joint','unsure') NOT NULL DEFAULT 'unsure',
  `preferred_province` varchar(100),
  `preferred_city` varchar(100),
  `preferred_suburb` varchar(100),
  `target_price_min` int,
  `target_price_max` int,
  `credit_report_status` enum('checked_good','checked_unsure','not_checked_recently','needs_help','prefer_not_to_say'),
  `buying_timeline` varchar(120),
  `estimated_bond_amount` int,
  `metadata` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_buyer_qualification_session` (`session_id`),
  KEY `idx_buyer_qualification_lead` (`buyer_lead_id`),
  KEY `idx_buyer_qualification_location` (`preferred_province`,`preferred_city`,`preferred_suburb`),
  KEY `idx_buyer_qualification_income` (`gross_monthly_income`),
  CONSTRAINT `buyer_qual_session_fk`
    FOREIGN KEY (`session_id`) REFERENCES `lead_funnel_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `buyer_qualification_profiles_buyer_lead_id_buyer_leads_id_fk`
    FOREIGN KEY (`buyer_lead_id`) REFERENCES `buyer_leads` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `lead_development_matches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `buyer_lead_id` int,
  `session_id` int,
  `campaign_id` int,
  `development_id` int NOT NULL,
  `match_score` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `match_label` enum('good_match','possible_match','needs_review','not_suitable') NOT NULL DEFAULT 'needs_review',
  `match_reasons` json,
  `income_eligible` tinyint NOT NULL DEFAULT 0,
  `location_match` tinyint NOT NULL DEFAULT 0,
  `campaign_eligible` tinyint NOT NULL DEFAULT 0,
  `distribution_ready` tinyint NOT NULL DEFAULT 0,
  `submission_allowed` tinyint NOT NULL DEFAULT 0,
  `selected_by_buyer` tinyint NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lead_development_matches_lead` (`buyer_lead_id`),
  KEY `idx_lead_development_matches_session` (`session_id`),
  KEY `idx_lead_development_matches_campaign` (`campaign_id`),
  KEY `idx_lead_development_matches_development` (`development_id`),
  KEY `idx_lead_development_matches_score` (`match_score`),
  KEY `idx_lead_development_matches_selected` (`selected_by_buyer`),
  CONSTRAINT `lead_development_matches_buyer_lead_id_buyer_leads_id_fk`
    FOREIGN KEY (`buyer_lead_id`) REFERENCES `buyer_leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lead_development_matches_session_id_lead_funnel_sessions_id_fk`
    FOREIGN KEY (`session_id`) REFERENCES `lead_funnel_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lead_development_matches_campaign_id_lead_campaigns_id_fk`
    FOREIGN KEY (`campaign_id`) REFERENCES `lead_campaigns` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lead_development_matches_development_id_developments_id_fk`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `lead_routing_decisions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `buyer_lead_id` int NOT NULL,
  `session_id` int,
  `campaign_id` int,
  `selected_match_id` int,
  `development_id` int,
  `source_type` enum('meta_ads','google_ads','organic','whatsapp','linkedin_ads','direct','internal_explore','manual') NOT NULL DEFAULT 'direct',
  `outcome` enum('route_to_distribution_program','route_to_internal_sales','route_to_developer_contact','route_to_general_review','route_to_whatsapp_followup','route_to_credit_readiness') NOT NULL,
  `owner_type` enum('distribution_program','internal_sales','developer_contact','whatsapp','credit_readiness','general_review','unassigned') NOT NULL DEFAULT 'unassigned',
  `owner_id` int,
  `assigned_user_id` int,
  `distribution_deal_id` int,
  `reason` text,
  `metadata` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lead_routing_decisions_lead` (`buyer_lead_id`),
  KEY `idx_lead_routing_decisions_session` (`session_id`),
  KEY `idx_lead_routing_decisions_campaign` (`campaign_id`),
  KEY `idx_lead_routing_decisions_development` (`development_id`),
  KEY `idx_lead_routing_decisions_outcome` (`outcome`),
  KEY `idx_lead_routing_decisions_owner` (`owner_type`,`owner_id`),
  KEY `idx_lead_routing_decisions_deal` (`distribution_deal_id`),
  CONSTRAINT `lead_routing_decisions_buyer_lead_id_buyer_leads_id_fk`
    FOREIGN KEY (`buyer_lead_id`) REFERENCES `buyer_leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lead_routing_decisions_session_id_lead_funnel_sessions_id_fk`
    FOREIGN KEY (`session_id`) REFERENCES `lead_funnel_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lead_routing_decisions_campaign_id_lead_campaigns_id_fk`
    FOREIGN KEY (`campaign_id`) REFERENCES `lead_campaigns` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lead_route_selected_match_fk`
    FOREIGN KEY (`selected_match_id`) REFERENCES `lead_development_matches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lead_routing_decisions_development_id_developments_id_fk`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lead_routing_decisions_assigned_user_id_users_id_fk`
    FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lead_route_distribution_deal_fk`
    FOREIGN KEY (`distribution_deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `lead_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `buyer_lead_id` int,
  `session_id` int,
  `campaign_id` int,
  `source_type` enum('meta_ads','google_ads','organic','whatsapp','linkedin_ads','direct','internal_explore','manual') NOT NULL DEFAULT 'direct',
  `event_type` enum('session_created','qualification_started','qualification_completed','lead_captured','duplicate_detected','matches_generated','development_selected','routing_decided','distribution_handoff_created','whatsapp_clicked','status_changed') NOT NULL,
  `payload` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lead_events_lead` (`buyer_lead_id`),
  KEY `idx_lead_events_session` (`session_id`),
  KEY `idx_lead_events_campaign` (`campaign_id`),
  KEY `idx_lead_events_source` (`source_type`),
  KEY `idx_lead_events_type` (`event_type`),
  KEY `idx_lead_events_created` (`created_at`),
  CONSTRAINT `lead_events_buyer_lead_id_buyer_leads_id_fk`
    FOREIGN KEY (`buyer_lead_id`) REFERENCES `buyer_leads` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lead_events_session_id_lead_funnel_sessions_id_fk`
    FOREIGN KEY (`session_id`) REFERENCES `lead_funnel_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lead_events_campaign_id_lead_campaigns_id_fk`
    FOREIGN KEY (`campaign_id`) REFERENCES `lead_campaigns` (`id`) ON DELETE SET NULL
);
