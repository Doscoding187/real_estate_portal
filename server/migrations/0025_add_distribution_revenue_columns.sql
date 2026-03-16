ALTER TABLE `distribution_deals`
ADD COLUMN `deal_amount` INT NOT NULL DEFAULT 0 AFTER `buyer_phone`;

ALTER TABLE `distribution_deals`
ADD COLUMN `platform_amount` INT NOT NULL DEFAULT 0 AFTER `deal_amount`;

ALTER TABLE `distribution_deals`
ADD INDEX `idx_distribution_deals_deal_amount` (`deal_amount`);

ALTER TABLE `distribution_deals`
ADD INDEX `idx_distribution_deals_platform_amount` (`platform_amount`);

-- DOWN (manual rollback only)
-- ALTER TABLE `distribution_deals` DROP INDEX `idx_distribution_deals_platform_amount`;
-- ALTER TABLE `distribution_deals` DROP INDEX `idx_distribution_deals_deal_amount`;
-- ALTER TABLE `distribution_deals` DROP COLUMN `platform_amount`;
-- ALTER TABLE `distribution_deals` DROP COLUMN `deal_amount`;
