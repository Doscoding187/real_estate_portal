-- AW-MVP-001/002: the single curated person and relationship authority for Agent Workplace.
-- Source/capture records remain in their current domains; this migration creates no links or backfill.
CREATE TABLE `contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_user_id` int NOT NULL,
  `agency_id` int NULL,
  `visibility` enum('private','agency_shared') NOT NULL DEFAULT 'private',
  `full_name` varchar(200) NOT NULL,
  `email` varchar(320) NULL,
  `phone` varchar(50) NULL,
  `company` varchar(200) NULL,
  `notes` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contacts_owner_updated` (`owner_user_id`,`updated_at`),
  KEY `idx_contacts_agency_visibility_updated` (`agency_id`,`visibility`,`updated_at`),
  CONSTRAINT `contacts_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `contacts_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_contacts_shared_requires_agency` CHECK ((`visibility` = 'private') OR (`agency_id` IS NOT NULL))
);
