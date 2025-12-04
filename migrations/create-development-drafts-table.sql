-- Create development_drafts table for saving development wizard drafts
-- This allows developers to save multiple drafts and resume them later

CREATE TABLE IF NOT EXISTS `development_drafts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `developerId` int NOT NULL,
  `draftName` varchar(255) DEFAULT NULL COMMENT 'Optional name for the draft (auto-generated from development name)',
  `draftData` json NOT NULL COMMENT 'Full wizard state including all fields',
  `progress` int NOT NULL DEFAULT 0 COMMENT 'Progress percentage (0-100)',
  `currentStep` int NOT NULL DEFAULT 0 COMMENT 'Current wizard step (0-6)',
  `lastModified` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dev_drafts_developer_id` (`developerId`),
  KEY `idx_dev_drafts_last_modified` (`lastModified`),
  CONSTRAINT `fk_dev_drafts_developer` FOREIGN KEY (`developerId`) REFERENCES `developers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Development wizard drafts for developers';
