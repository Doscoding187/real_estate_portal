-- Add affordability data fields to leads table
-- Validates: Requirements 4.3, 5.3

ALTER TABLE `leads` 
ADD COLUMN `affordability_data` JSON NULL COMMENT 'Buyer affordability calculation results',
ADD COLUMN `qualification_status` ENUM('qualified', 'partially_qualified', 'unqualified', 'pending') DEFAULT 'pending',
ADD COLUMN `qualification_score` INT DEFAULT 0 COMMENT 'Qualification score 0-100',
ADD COLUMN `lead_source` VARCHAR(100) NULL COMMENT 'Lead source channel',
ADD COLUMN `referrer_url` TEXT NULL COMMENT 'Referrer URL',
ADD COLUMN `utm_source` VARCHAR(100) NULL,
ADD COLUMN `utm_medium` VARCHAR(100) NULL,
ADD COLUMN `utm_campaign` VARCHAR(100) NULL,
ADD COLUMN `funnel_stage` ENUM('interest', 'affordability', 'qualification', 'viewing', 'offer', 'bond', 'sale') DEFAULT 'interest',
ADD COLUMN `assigned_to` INT NULL COMMENT 'User ID of assigned sales team member',
ADD COLUMN `assigned_at` TIMESTAMP NULL,
ADD COLUMN `converted_at` TIMESTAMP NULL,
ADD COLUMN `lost_reason` TEXT NULL;

-- Add index for faster queries
CREATE INDEX `idx_leads_qualification_status` ON `leads` (`qualification_status`);
CREATE INDEX `idx_leads_funnel_stage` ON `leads` (`funnel_stage`);
CREATE INDEX `idx_leads_assigned_to` ON `leads` (`assigned_to`);
CREATE INDEX `idx_leads_lead_source` ON `leads` (`lead_source`);
