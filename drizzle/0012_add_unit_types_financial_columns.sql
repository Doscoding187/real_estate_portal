-- Migration: Add financial columns to unit_types table
-- Generated: 2026-01-12
-- Adds levy ranges, rates, and extras for unit type pricing

-- Add levy range columns (nullable for existing records)
ALTER TABLE `unit_types` ADD COLUMN `monthly_levy_from` int DEFAULT NULL;
ALTER TABLE `unit_types` ADD COLUMN `monthly_levy_to` int DEFAULT NULL;

-- Add rates/taxes range columns (nullable for existing records)
ALTER TABLE `unit_types` ADD COLUMN `rates_and_taxes_from` int DEFAULT NULL;
ALTER TABLE `unit_types` ADD COLUMN `rates_and_taxes_to` int DEFAULT NULL;

-- Add extras JSON column for additional pricing options (nullable)
ALTER TABLE `unit_types` ADD COLUMN `extras` json DEFAULT NULL;
