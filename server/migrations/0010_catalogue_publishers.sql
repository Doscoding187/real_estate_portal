CREATE TABLE `catalogue_publishers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `authority_kind` enum('platform_reference','developer_first_party') NOT NULL,
  `publisher_type` enum('developer','marketing_agency','hybrid') NOT NULL DEFAULT 'developer',
  `developer_organisation_id` int,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `logo_url` text,
  `about` text,
  `founded_year` int,
  `head_office_location` varchar(255),
  `operating_provinces` json,
  `property_focus` json,
  `website_url` varchar(500),
  `public_contact_email` varchar(320),
  `brand_tier` enum('national','regional','boutique') DEFAULT 'regional',
  `source_attribution` varchar(255),
  `is_visible` tinyint NOT NULL DEFAULT 1,
  `is_contact_verified` tinyint NOT NULL DEFAULT 0,
  `created_by_user_id` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `catalogue_publishers_id` PRIMARY KEY (`id`),
  CONSTRAINT `uq_catalogue_publishers_slug` UNIQUE (`slug`),
  CONSTRAINT `uq_catalogue_publishers_first_party_organisation` UNIQUE (`developer_organisation_id`),
  CONSTRAINT `fk_catalogue_publishers_organisation` FOREIGN KEY (`developer_organisation_id`) REFERENCES `developer_organisations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_catalogue_publishers_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_catalogue_publishers_authority_shape` CHECK (
    (`authority_kind` = 'platform_reference' AND `developer_organisation_id` IS NULL)
    OR (`authority_kind` = 'developer_first_party' AND `developer_organisation_id` IS NOT NULL)
  ),
  CONSTRAINT `chk_catalogue_publishers_platform_source` CHECK (
    `authority_kind` <> 'platform_reference'
    OR CHAR_LENGTH(TRIM(COALESCE(`source_attribution`, ''))) > 0
  ),
  KEY `idx_catalogue_publishers_authority_visible` (`authority_kind`, `is_visible`),
  KEY `idx_catalogue_publishers_organisation` (`developer_organisation_id`)
);
