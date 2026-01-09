CREATE TABLE `boost_campaigns` (
	`id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`topic_id` varchar(36) NOT NULL,
	`budget` decimal(10,2) NOT NULL,
	`spent` decimal(10,2) DEFAULT '0',
	`status` enum('draft','active','paused','completed','depleted') DEFAULT 'draft',
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`cost_per_impression` decimal(6,4) DEFAULT '0.10',
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `boost_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bundle_partners` (
	`bundle_id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`category` varchar(100) NOT NULL,
	`display_order` int DEFAULT 0,
	`inclusion_fee` decimal(10,2),
	`performance_score` decimal(5,2) DEFAULT '50.00'
);
--> statement-breakpoint
CREATE TABLE `content_approval_queue` (
	`id` varchar(36) NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`status` enum('pending','approved','rejected','revision_requested') DEFAULT 'pending',
	`submitted_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`reviewed_at` timestamp,
	`reviewer_id` varchar(36),
	`feedback` text,
	`auto_approval_eligible` boolean DEFAULT false,
	CONSTRAINT `content_approval_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_quality_scores` (
	`content_id` varchar(36) NOT NULL,
	`overall_score` decimal(5,2) DEFAULT '50.00',
	`metadata_score` decimal(5,2) DEFAULT '0',
	`engagement_score` decimal(5,2) DEFAULT '0',
	`production_score` decimal(5,2) DEFAULT '0',
	`negative_signals` int DEFAULT 0,
	`last_calculated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `content_quality_scores_content_id` PRIMARY KEY(`content_id`)
);
--> statement-breakpoint
CREATE TABLE `content_topics` (
	`content_id` varchar(36) NOT NULL,
	`topic_id` varchar(36) NOT NULL,
	`relevance_score` decimal(5,2) DEFAULT '1.00',
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_partners` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`tier_id` int NOT NULL,
	`company_name` varchar(255) NOT NULL,
	`description` text,
	`logo_url` varchar(500),
	`verification_status` enum('pending','verified','rejected') DEFAULT 'pending',
	`trust_score` decimal(5,2) DEFAULT '50.00',
	`service_locations` json,
	`approved_content_count` int DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `founding_partners` (
	`partner_id` varchar(36) NOT NULL,
	`enrollment_date` timestamp NOT NULL,
	`benefits_end_date` timestamp NOT NULL,
	`pre_launch_content_delivered` int DEFAULT 0,
	`weekly_content_delivered` json DEFAULT ('[]'),
	`warning_count` int DEFAULT 0,
	`status` enum('active','warning','revoked') DEFAULT 'active',
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `founding_partners_partner_id` PRIMARY KEY(`partner_id`)
);
--> statement-breakpoint
CREATE TABLE `launch_content_quotas` (
	`id` varchar(36) NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`required_count` int NOT NULL,
	`current_count` int DEFAULT 0,
	`last_updated` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `launch_content_quotas_id` PRIMARY KEY(`id`),
	CONSTRAINT `launch_content_quotas_content_type_unique` UNIQUE(`content_type`)
);
--> statement-breakpoint
CREATE TABLE `launch_metrics` (
	`id` varchar(36) NOT NULL,
	`metric_date` timestamp NOT NULL,
	`topic_engagement_rate` decimal(5,2),
	`partner_content_watch_rate` decimal(5,2),
	`save_share_rate` decimal(5,2),
	`weekly_visits_per_user` decimal(5,2),
	`algorithm_confidence_score` decimal(5,2),
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `launch_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `launch_phases` (
	`id` varchar(36) NOT NULL,
	`phase` enum('pre_launch','launch_period','ramp_up','ecosystem_maturity') NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`primary_content_ratio` decimal(3,2) DEFAULT '0.70',
	`algorithm_weight` decimal(3,2) DEFAULT '0.00',
	`editorial_weight` decimal(3,2) DEFAULT '1.00',
	`is_active` boolean DEFAULT false,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `launch_phases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_bundles` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`target_audience` varchar(100),
	`is_active` boolean DEFAULT true,
	`display_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_bundles_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_bundles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `partner_leads` (
	`id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`content_id` varchar(36),
	`type` enum('quote_request','consultation','eligibility_check') NOT NULL,
	`status` enum('new','contacted','converted','disputed','refunded') DEFAULT 'new',
	`price` decimal(10,2) NOT NULL,
	`contact_info` json NOT NULL,
	`intent_details` text,
	`dispute_reason` text,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partner_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_subscriptions` (
	`id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`tier` enum('free','basic','premium','featured') NOT NULL,
	`price_monthly` decimal(10,2) NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`status` enum('active','cancelled','expired') DEFAULT 'active',
	`features` json NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `partner_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_tiers` (
	`id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`allowed_content_types` json NOT NULL,
	`allowed_ctas` json NOT NULL,
	`requires_credentials` boolean DEFAULT false,
	`max_monthly_content` int DEFAULT 10,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`display_order` int DEFAULT 0,
	`is_active` boolean DEFAULT true,
	`content_tags` json,
	`property_features` json,
	`partner_categories` json,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `topics_id` PRIMARY KEY(`id`),
	CONSTRAINT `topics_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `user_onboarding_state` (
	`user_id` varchar(36) NOT NULL,
	`is_first_session` boolean DEFAULT true,
	`welcome_overlay_shown` boolean DEFAULT false,
	`welcome_overlay_dismissed` boolean DEFAULT false,
	`suggested_topics` json,
	`tooltips_shown` json DEFAULT ('[]'),
	`content_view_count` int DEFAULT 0,
	`save_count` int DEFAULT 0,
	`partner_engagement_count` int DEFAULT 0,
	`features_unlocked` json DEFAULT ('[]'),
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_onboarding_state_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `developments` ADD `monthly_levy_from` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `developments` ADD `monthly_levy_to` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `developments` ADD `rates_from` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `developments` ADD `rates_to` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `developments` ADD `transfer_costs_included` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `explore_content` ADD `partner_id` varchar(36);--> statement-breakpoint
ALTER TABLE `explore_content` ADD `content_category` enum('primary','secondary','tertiary') DEFAULT 'primary';--> statement-breakpoint
ALTER TABLE `explore_content` ADD `badge_type` varchar(50);--> statement-breakpoint
ALTER TABLE `explore_content` ADD `is_launch_content` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD `partner_id` varchar(36);--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD `content_category` enum('primary','secondary','tertiary') DEFAULT 'primary';--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD `badge_type` varchar(50);--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD `is_launch_content` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `monthly_levy_from` int;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `monthly_levy_to` int;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `rates_and_taxes_from` int;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `rates_and_taxes_to` int;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `extras` json;--> statement-breakpoint
ALTER TABLE `boost_campaigns` ADD CONSTRAINT `boost_campaigns_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boost_campaigns` ADD CONSTRAINT `boost_campaigns_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bundle_partners` ADD CONSTRAINT `bundle_partners_bundle_id_marketplace_bundles_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `marketplace_bundles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bundle_partners` ADD CONSTRAINT `bundle_partners_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_approval_queue` ADD CONSTRAINT `content_approval_queue_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_topics` ADD CONSTRAINT `content_topics_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_partners` ADD CONSTRAINT `explore_partners_tier_id_partner_tiers_id_fk` FOREIGN KEY (`tier_id`) REFERENCES `partner_tiers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `founding_partners` ADD CONSTRAINT `founding_partners_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_leads` ADD CONSTRAINT `partner_leads_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_subscriptions` ADD CONSTRAINT `partner_subscriptions_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_boost_status` ON `boost_campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `idx_boost_topic` ON `boost_campaigns` (`topic_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_boost_partner` ON `boost_campaigns` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_bundle_category` ON `bundle_partners` (`bundle_id`,`category`);--> statement-breakpoint
CREATE INDEX `idx_approval_status` ON `content_approval_queue` (`status`);--> statement-breakpoint
CREATE INDEX `idx_approval_partner` ON `content_approval_queue` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_quality_score` ON `content_quality_scores` (`overall_score`);--> statement-breakpoint
CREATE INDEX `idx_content_topic` ON `content_topics` (`topic_id`);--> statement-breakpoint
CREATE INDEX `idx_partner_tier` ON `explore_partners` (`tier_id`);--> statement-breakpoint
CREATE INDEX `idx_partner_verification` ON `explore_partners` (`verification_status`);--> statement-breakpoint
CREATE INDEX `idx_partner_trust` ON `explore_partners` (`trust_score`);--> statement-breakpoint
CREATE INDEX `idx_metrics_date` ON `launch_metrics` (`metric_date`);--> statement-breakpoint
CREATE INDEX `idx_lead_partner` ON `partner_leads` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_lead_status` ON `partner_leads` (`status`);--> statement-breakpoint
CREATE INDEX `idx_lead_type` ON `partner_leads` (`type`);--> statement-breakpoint
CREATE INDEX `idx_subscription_partner` ON `partner_subscriptions` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_subscription_status` ON `partner_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_topic_slug` ON `topics` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_topic_active` ON `topics` (`is_active`,`display_order`);--> statement-breakpoint
CREATE INDEX `idx_content_partner` ON `explore_content` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_content_category` ON `explore_content` (`content_category`);--> statement-breakpoint
CREATE INDEX `idx_shorts_partner` ON `explore_shorts` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_shorts_category` ON `explore_shorts` (`content_category`);