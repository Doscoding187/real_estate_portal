CREATE TABLE IF NOT EXISTS `distribution_brand_partnerships` (
  `id` int AUTO_INCREMENT NOT NULL,
  `brand_profile_id` int NOT NULL,
  `status` enum('pending','active','paused','ended') NOT NULL DEFAULT 'pending',
  `channel_scope` json DEFAULT NULL,
  `partnered_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `reason_code` varchar(80) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_brand_partnerships_id` PRIMARY KEY(`id`),
  CONSTRAINT `ux_distribution_brand_partnerships_brand` UNIQUE(`brand_profile_id`),
  CONSTRAINT `fk_distribution_brand_partnerships_brand_profile` FOREIGN KEY (`brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_brand_partnerships_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_brand_partnerships_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  KEY `idx_distribution_brand_partnerships_status` (`status`),
  KEY `idx_distribution_brand_partnerships_updated_at` (`updated_at`)
);

CREATE TABLE IF NOT EXISTS `distribution_development_access` (
  `id` int AUTO_INCREMENT NOT NULL,
  `development_id` int NOT NULL,
  `brand_partnership_id` int NOT NULL,
  `brand_profile_id` int NOT NULL,
  `status` enum('listed','included','excluded','paused') NOT NULL DEFAULT 'listed',
  `submission_allowed` tinyint NOT NULL DEFAULT 0,
  `excluded_by_mandate` tinyint NOT NULL DEFAULT 0,
  `excluded_by_exclusivity` tinyint NOT NULL DEFAULT 0,
  `visibility_scope` json DEFAULT NULL,
  `reason_code` varchar(80) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `included_at` timestamp NULL DEFAULT NULL,
  `excluded_at` timestamp NULL DEFAULT NULL,
  `paused_at` timestamp NULL DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_development_access_id` PRIMARY KEY(`id`),
  CONSTRAINT `ux_distribution_development_access_development` UNIQUE(`development_id`),
  CONSTRAINT `fk_distribution_development_access_development` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_development_access_brand_partnership` FOREIGN KEY (`brand_partnership_id`) REFERENCES `distribution_brand_partnerships`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_development_access_brand_profile` FOREIGN KEY (`brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_development_access_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_development_access_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  KEY `idx_distribution_development_access_partnership` (`brand_partnership_id`),
  KEY `idx_distribution_development_access_brand` (`brand_profile_id`),
  KEY `idx_distribution_development_access_status` (`status`),
  KEY `idx_distribution_development_access_submission_allowed` (`submission_allowed`),
  KEY `idx_distribution_development_access_status_submission` (`status`,`submission_allowed`),
  KEY `idx_distribution_development_access_updated_at` (`updated_at`)
);

-- Backfill canonical brand partnerships for brands that already have program footprint.
INSERT INTO `distribution_brand_partnerships` (
  `brand_profile_id`,
  `status`,
  `channel_scope`,
  `partnered_at`,
  `reason_code`,
  `notes`,
  `created_at`,
  `updated_at`
)
SELECT
  footprint.`brand_profile_id`,
  'active',
  JSON_ARRAY('distribution_network'),
  CURRENT_TIMESTAMP,
  'legacy_backfill_program_present',
  'Backfilled from existing distribution program footprint.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT
    COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) AS `brand_profile_id`
  FROM `distribution_programs` dp
  INNER JOIN `developments` d ON d.`id` = dp.`development_id`
  WHERE COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) IS NOT NULL
) footprint
LEFT JOIN `distribution_brand_partnerships` existing
  ON existing.`brand_profile_id` = footprint.`brand_profile_id`
WHERE footprint.`brand_profile_id` IS NOT NULL
  AND existing.`id` IS NULL;

-- Backfill pending partnerships for listed-only brands without program footprint.
INSERT INTO `distribution_brand_partnerships` (
  `brand_profile_id`,
  `status`,
  `channel_scope`,
  `reason_code`,
  `notes`,
  `created_at`,
  `updated_at`
)
SELECT
  listed.`brand_profile_id`,
  'pending',
  JSON_ARRAY('distribution_network'),
  'legacy_backfill_listed_only',
  'Backfilled from brand-linked published/approved development without program footprint.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT
    COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) AS `brand_profile_id`
  FROM `developments` d
  WHERE d.`isPublished` = 1
    AND d.`approval_status` = 'approved'
    AND COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) IS NOT NULL
) listed
LEFT JOIN `distribution_brand_partnerships` existing
  ON existing.`brand_profile_id` = listed.`brand_profile_id`
WHERE listed.`brand_profile_id` IS NOT NULL
  AND existing.`id` IS NULL;

-- Backfill development access rows for developments that already have program footprint.
INSERT INTO `distribution_development_access` (
  `development_id`,
  `brand_partnership_id`,
  `brand_profile_id`,
  `status`,
  `submission_allowed`,
  `reason_code`,
  `notes`,
  `included_at`,
  `created_at`,
  `updated_at`
)
SELECT
  seeded.`development_id`,
  partnership.`id` AS `brand_partnership_id`,
  seeded.`brand_profile_id`,
  'included',
  seeded.`submission_allowed`,
  'legacy_backfill_program_present',
  'Backfilled from existing distribution program footprint.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT
    d.`id` AS `development_id`,
    COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) AS `brand_profile_id`,
    CASE
      WHEN dp.`is_active` = 1 AND dp.`is_referral_enabled` = 1 THEN 1
      ELSE 0
    END AS `submission_allowed`
  FROM `distribution_programs` dp
  INNER JOIN `developments` d ON d.`id` = dp.`development_id`
  WHERE COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) IS NOT NULL
) seeded
INNER JOIN `distribution_brand_partnerships` partnership
  ON partnership.`brand_profile_id` = seeded.`brand_profile_id`
LEFT JOIN `distribution_development_access` existing
  ON existing.`development_id` = seeded.`development_id`
WHERE existing.`id` IS NULL;

-- Backfill listed-only development access rows for visible brand-linked developments without programs.
INSERT INTO `distribution_development_access` (
  `development_id`,
  `brand_partnership_id`,
  `brand_profile_id`,
  `status`,
  `submission_allowed`,
  `reason_code`,
  `notes`,
  `created_at`,
  `updated_at`
)
SELECT
  listed.`development_id`,
  partnership.`id` AS `brand_partnership_id`,
  listed.`brand_profile_id`,
  'listed',
  0,
  'legacy_backfill_listed_only',
  'Backfilled from brand-linked published/approved development without program footprint.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT
    d.`id` AS `development_id`,
    COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) AS `brand_profile_id`
  FROM `developments` d
  LEFT JOIN `distribution_programs` dp ON dp.`development_id` = d.`id`
  WHERE dp.`id` IS NULL
    AND d.`isPublished` = 1
    AND d.`approval_status` = 'approved'
    AND COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) IS NOT NULL
) listed
INNER JOIN `distribution_brand_partnerships` partnership
  ON partnership.`brand_profile_id` = listed.`brand_profile_id`
LEFT JOIN `distribution_development_access` existing
  ON existing.`development_id` = listed.`development_id`
WHERE existing.`id` IS NULL;
