ALTER TABLE `development_drafts` MODIFY COLUMN `developerId` int;--> statement-breakpoint
ALTER TABLE `developer_brand_profiles` ADD `identity_type` enum('developer','marketing_agency','hybrid') DEFAULT 'developer' NOT NULL;--> statement-breakpoint
ALTER TABLE `development_drafts` ADD `developer_brand_profile_id` int;--> statement-breakpoint
ALTER TABLE `developments` ADD `marketing_brand_profile_id` int;--> statement-breakpoint
ALTER TABLE `developments` ADD `marketing_role` enum('exclusive','joint','open') DEFAULT 'exclusive';--> statement-breakpoint
ALTER TABLE `development_drafts` ADD CONSTRAINT `development_drafts_developer_brand_profile_id_developer_brand_profiles_id_fk` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `developments_marketing_brand_profile_id_developer_brand_profiles_id_fk` FOREIGN KEY (`marketing_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_dev_drafts_brand_profile_id` ON `development_drafts` (`developer_brand_profile_id`);