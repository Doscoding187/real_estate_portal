-- Add missing columns to listings table
-- These columns are defined in drizzle/schema.ts but missing from the production DB

ALTER TABLE listings
ADD COLUMN `readiness_score` int(11) NOT NULL DEFAULT 0 AFTER `slug`;

ALTER TABLE listings
ADD COLUMN `quality_score` int(11) NOT NULL DEFAULT 0 AFTER `readiness_score`;

ALTER TABLE listings
ADD COLUMN `quality_breakdown` json DEFAULT NULL AFTER `quality_score`;

ALTER TABLE listings
ADD COLUMN `rejection_reasons` json DEFAULT NULL AFTER `quality_breakdown`;

ALTER TABLE listings
ADD COLUMN `rejection_note` text DEFAULT NULL AFTER `rejection_reasons`;
