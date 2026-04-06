-- Migration: Reconcile showings schema drift
-- Goal: Standardize showings around the agent dashboard contract while preserving existing data.
-- Canonical shape after this migration:
--   id, listingId?, propertyId?, leadId?, agentId, scheduledAt, status(requested|confirmed|completed|cancelled|no_show), notes, createdAt, updatedAt

ALTER TABLE `showings`
ADD COLUMN `listingId` int NULL AFTER `id`;

ALTER TABLE `showings`
ADD COLUMN `propertyId` int NULL AFTER `listingId`;

ALTER TABLE `showings`
ADD COLUMN `leadId` int NULL AFTER `propertyId`;

ALTER TABLE `showings`
ADD COLUMN `scheduledTime` timestamp NULL AFTER `agentId`;

ALTER TABLE `showings`
ADD COLUMN `scheduledAt` timestamp NULL AFTER `agentId`;

ALTER TABLE `showings`
ADD COLUMN `visitorId` int NULL AFTER `agentId`;

ALTER TABLE `showings`
ADD COLUMN `visitorName` varchar(150) NULL AFTER `visitorId`;

ALTER TABLE `showings`
ADD COLUMN `durationMinutes` int NOT NULL DEFAULT 30 AFTER `scheduledAt`;

ALTER TABLE `showings`
ADD COLUMN `notes` text;

ALTER TABLE `showings`
ADD COLUMN `feedback` text AFTER `notes`;

ALTER TABLE `showings`
MODIFY COLUMN `status` ENUM('requested','confirmed','completed','cancelled','no_show','scheduled') NOT NULL DEFAULT 'requested';

UPDATE `showings`
SET `scheduledAt` = COALESCE(`scheduledAt`, `scheduledTime`);

UPDATE `showings`
SET `status` = 'confirmed'
WHERE `status` = 'scheduled';

UPDATE `showings`
SET `scheduledAt` = COALESCE(`scheduledAt`, CURRENT_TIMESTAMP);

ALTER TABLE `showings`
MODIFY COLUMN `scheduledAt` timestamp NOT NULL;

ALTER TABLE `showings`
MODIFY COLUMN `status` ENUM('requested','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'requested';

ALTER TABLE `showings`
DROP COLUMN `scheduledTime`;

ALTER TABLE `showings`
ADD INDEX `idx_showings_agent_scheduled_at` (`agentId`, `scheduledAt`);

ALTER TABLE `showings`
ADD INDEX `idx_showings_listing` (`listingId`);

ALTER TABLE `showings`
ADD INDEX `idx_showings_property` (`propertyId`);
