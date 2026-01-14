CREATE TABLE `development_lead_routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`source_type` enum('developer_profile','agency_profile','development_page','campaign') NOT NULL,
	`source_brand_profile_id` int,
	`receiver_brand_profile_id` int NOT NULL,
	`fallback_brand_profile_id` int,
	`priority` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `development_lead_routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`brand_profile_id` int NOT NULL,
	`partner_type` enum('co_developer','joint_venture','investor','builder','marketing_agency','selling_agency') NOT NULL DEFAULT 'co_developer',
	`permissions` json,
	`visibility_scope` enum('profile_public','internal_only','marketing_only') NOT NULL DEFAULT 'profile_public',
	`display_order` int NOT NULL DEFAULT 0,
	`is_primary` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `development_partners_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_dev_partner_unique` UNIQUE(`development_id`,`brand_profile_id`)
);
--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `status` enum('launching-soon','selling','sold-out') NOT NULL DEFAULT 'launching-soon';--> statement-breakpoint
ALTER TABLE `developments` ADD `nature` enum('new','phase','extension','redevelopment') DEFAULT 'new';--> statement-breakpoint
ALTER TABLE `developments` ADD `total_development_area` int;--> statement-breakpoint
ALTER TABLE `developments` ADD `property_types` json;--> statement-breakpoint
ALTER TABLE `developments` ADD `custom_classification` varchar(255);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `label` varchar(255);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `description` text;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `ownership_type` enum('full-title','sectional-title','leasehold','life-rights') DEFAULT 'sectional-title';--> statement-breakpoint
ALTER TABLE `unit_types` ADD `structural_type` enum('apartment','freestanding-house','simplex','duplex','penthouse','plot-and-plan','townhouse','studio') DEFAULT 'apartment';--> statement-breakpoint
ALTER TABLE `unit_types` ADD `floors` enum('single-storey','double-storey','triplex');--> statement-breakpoint
ALTER TABLE `unit_types` ADD `parking_type` varchar(50);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `parking_bays` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `size_from` int;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `size_to` int;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `price_from` decimal(15,2);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `price_to` decimal(15,2);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `deposit_required` decimal(15,2);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `completion_date` date;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `spec_overrides` json;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `specifications` json;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `amenities` json;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `features` json;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `config_description` text;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `virtual_tour_link` varchar(500);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `internal_notes` text;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `development_lead_routes_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `development_lead_routes_source_brand_profile_id_developer_brand_profiles_id_fk` FOREIGN KEY (`source_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `development_lead_routes_receiver_brand_profile_id_developer_brand_profiles_id_fk` FOREIGN KEY (`receiver_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `development_lead_routes_fallback_brand_profile_id_developer_brand_profiles_id_fk` FOREIGN KEY (`fallback_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_partners` ADD CONSTRAINT `development_partners_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_partners` ADD CONSTRAINT `development_partners_brand_profile_id_developer_brand_profiles_id_fk` FOREIGN KEY (`brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_lead_routes_development_id` ON `development_lead_routes` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_lead_routes_source_type` ON `development_lead_routes` (`source_type`);--> statement-breakpoint
CREATE INDEX `idx_lead_routes_lookup` ON `development_lead_routes` (`development_id`,`source_type`,`source_brand_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_partners_development_id` ON `development_partners` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_partners_brand_profile_id` ON `development_partners` (`brand_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_partners_partner_type` ON `development_partners` (`partner_type`);