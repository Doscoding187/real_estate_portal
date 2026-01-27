-- Manual migration: Add missing financial columns to developments table
-- Generated: 2026-01-12
-- Note: Some columns (is_high_demand, dev_owner_type, is_showcase) already exist

-- Add monthly levy columns (nullable for existing records)
ALTER TABLE `developments` ADD COLUMN `monthly_levy_from` decimal(10,2) DEFAULT NULL;
ALTER TABLE `developments` ADD COLUMN `monthly_levy_to` decimal(10,2) DEFAULT NULL;

-- Add rates columns (nullable for existing records)
ALTER TABLE `developments` ADD COLUMN `rates_from` decimal(10,2) DEFAULT NULL;
ALTER TABLE `developments` ADD COLUMN `rates_to` decimal(10,2) DEFAULT NULL;

-- Add transfer costs flag (default 0 for existing records)
ALTER TABLE `developments` ADD COLUMN `transfer_costs_included` tinyint DEFAULT 0;

-- Add estate specs JSON column (nullable for existing records)
ALTER TABLE `developments` ADD COLUMN `estateSpecs` json DEFAULT NULL;
