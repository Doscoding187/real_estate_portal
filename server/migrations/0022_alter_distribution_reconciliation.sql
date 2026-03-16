ALTER TABLE `distribution_programs` RENAME INDEX `idx_distribution_program_active` TO `idx_distribution_programs_is_active`;
ALTER TABLE `distribution_programs` ADD INDEX `idx_distribution_programs_referral_enabled` (`is_referral_enabled`);
ALTER TABLE `distribution_programs` ADD INDEX `idx_distribution_programs_updated_at` (`updated_at`);

ALTER TABLE `distribution_agent_tiers` RENAME INDEX `idx_distribution_agent_tier_agent` TO `idx_distribution_agent_tiers_agent`;
ALTER TABLE `distribution_agent_tiers` RENAME INDEX `idx_distribution_agent_tier_level` TO `idx_distribution_agent_tiers_tier`;
ALTER TABLE `distribution_agent_tiers` ADD INDEX `idx_distribution_agent_tiers_effective_to` (`effective_to`);

ALTER TABLE `distribution_manager_assignments` RENAME INDEX `ux_distribution_manager_program_user` TO `ux_distribution_manager_assignment_program_manager`;
ALTER TABLE `distribution_manager_assignments` RENAME INDEX `idx_distribution_manager_user` TO `idx_distribution_manager_assignments_manager`;
ALTER TABLE `distribution_manager_assignments` RENAME INDEX `idx_distribution_manager_development` TO `idx_distribution_manager_assignments_development`;
ALTER TABLE `distribution_manager_assignments` RENAME INDEX `idx_distribution_manager_active` TO `idx_distribution_manager_assignments_active`;

ALTER TABLE `distribution_agent_access` ADD INDEX `idx_distribution_agent_access_agent` (`agent_id`);
ALTER TABLE `distribution_agent_access` ADD INDEX `idx_distribution_agent_access_updated_at` (`updated_at`);

ALTER TABLE `distribution_deals` RENAME INDEX `idx_distribution_deal_agent` TO `idx_distribution_deals_agent`;
ALTER TABLE `distribution_deals` RENAME INDEX `idx_distribution_deal_development` TO `idx_distribution_deals_development`;
ALTER TABLE `distribution_deals` RENAME INDEX `idx_distribution_deal_stage` TO `idx_distribution_deals_current_stage`;
ALTER TABLE `distribution_deals` RENAME INDEX `idx_distribution_deal_commission_status` TO `idx_distribution_deals_commission_status`;
ALTER TABLE `distribution_deals` ADD INDEX `idx_distribution_deals_program` (`program_id`);
ALTER TABLE `distribution_deals` ADD INDEX `idx_distribution_deals_manager` (`manager_user_id`);
ALTER TABLE `distribution_deals` ADD INDEX `idx_distribution_deals_submitted_at` (`submitted_at`);

ALTER TABLE `distribution_deals` DROP FOREIGN KEY `fk_distribution_deal_lead`;
ALTER TABLE `distribution_deals` DROP FOREIGN KEY `fk_distribution_deals_lead`;
ALTER TABLE `distribution_deals` DROP INDEX `fk_distribution_deal_lead`;
ALTER TABLE `distribution_deals` DROP INDEX `idx_distribution_deal_lead`;
ALTER TABLE `distribution_deals` DROP INDEX `lead_id`;
ALTER TABLE `distribution_deals` DROP COLUMN `lead_id`;

ALTER TABLE `distribution_deal_events` ADD INDEX `idx_distribution_deal_events_event_type` (`event_type`);

ALTER TABLE `distribution_viewings` RENAME INDEX `ux_distribution_viewing_deal` TO `ux_distribution_viewings_deal`;
ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewing_program` TO `idx_distribution_viewings_program`;
ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewing_development` TO `idx_distribution_viewings_development`;
ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewing_agent` TO `idx_distribution_viewings_agent`;
ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewing_manager` TO `idx_distribution_viewings_manager`;
ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewing_start` TO `idx_distribution_viewings_start`;
ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewing_status` TO `idx_distribution_viewings_status`;

ALTER TABLE `distribution_viewing_validations` RENAME INDEX `idx_distribution_viewing_validation_deal` TO `idx_distribution_viewing_validations_deal`;
ALTER TABLE `distribution_viewing_validations` RENAME INDEX `idx_distribution_viewing_validation_status` TO `idx_distribution_viewing_validations_status`;
ALTER TABLE `distribution_viewing_validations` ADD INDEX `idx_distribution_viewing_validations_validated_at` (`validated_at`);

ALTER TABLE `distribution_commission_entries` RENAME INDEX `idx_distribution_commission_program` TO `idx_distribution_commission_entries_program`;
ALTER TABLE `distribution_commission_entries` RENAME INDEX `idx_distribution_commission_agent` TO `idx_distribution_commission_entries_agent`;
ALTER TABLE `distribution_commission_entries` RENAME INDEX `idx_distribution_commission_status` TO `idx_distribution_commission_entries_status`;
ALTER TABLE `distribution_commission_entries` ADD INDEX `idx_distribution_commission_entries_development` (`development_id`);
ALTER TABLE `distribution_commission_entries` ADD INDEX `idx_distribution_commission_entries_updated_at` (`updated_at`);

ALTER TABLE `distribution_identities` ADD INDEX `idx_distribution_identities_type_active` (`identity_type`, `active`);

-- DOWN (manual rollback only)
-- ALTER TABLE `distribution_identities` DROP INDEX `idx_distribution_identities_type_active`;
-- ALTER TABLE `distribution_commission_entries` RENAME INDEX `idx_distribution_commission_entries_status` TO `idx_distribution_commission_status`;
-- ALTER TABLE `distribution_commission_entries` RENAME INDEX `idx_distribution_commission_entries_agent` TO `idx_distribution_commission_agent`;
-- ALTER TABLE `distribution_commission_entries` RENAME INDEX `idx_distribution_commission_entries_program` TO `idx_distribution_commission_program`;
-- ALTER TABLE `distribution_viewing_validations` RENAME INDEX `idx_distribution_viewing_validations_status` TO `idx_distribution_viewing_validation_status`;
-- ALTER TABLE `distribution_viewing_validations` RENAME INDEX `idx_distribution_viewing_validations_deal` TO `idx_distribution_viewing_validation_deal`;
-- ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewings_status` TO `idx_distribution_viewing_status`;
-- ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewings_start` TO `idx_distribution_viewing_start`;
-- ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewings_manager` TO `idx_distribution_viewing_manager`;
-- ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewings_agent` TO `idx_distribution_viewing_agent`;
-- ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewings_development` TO `idx_distribution_viewing_development`;
-- ALTER TABLE `distribution_viewings` RENAME INDEX `idx_distribution_viewings_program` TO `idx_distribution_viewing_program`;
-- ALTER TABLE `distribution_viewings` RENAME INDEX `ux_distribution_viewings_deal` TO `ux_distribution_viewing_deal`;
-- ALTER TABLE `distribution_deals` RENAME INDEX `idx_distribution_deals_commission_status` TO `idx_distribution_deal_commission_status`;
-- ALTER TABLE `distribution_deals` RENAME INDEX `idx_distribution_deals_current_stage` TO `idx_distribution_deal_stage`;
-- ALTER TABLE `distribution_deals` RENAME INDEX `idx_distribution_deals_development` TO `idx_distribution_deal_development`;
-- ALTER TABLE `distribution_deals` RENAME INDEX `idx_distribution_deals_agent` TO `idx_distribution_deal_agent`;
