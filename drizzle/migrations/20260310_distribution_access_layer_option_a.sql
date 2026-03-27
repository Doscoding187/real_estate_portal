CREATE TABLE IF NOT EXISTS `distribution_brand_partnerships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `brand_profile_id` int NOT NULL,
  `status` enum('pending','active','paused','ended') NOT NULL DEFAULT 'pending',
  `partnered_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `reason_code` varchar(80) DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_brand_partnerships_brand` (`brand_profile_id`),
  KEY `idx_distribution_brand_partnerships_status` (`status`),
  KEY `idx_distribution_brand_partnerships_updated_at` (`updated_at`),
  CONSTRAINT `fk_distribution_brand_partnerships_brand_profile`
    FOREIGN KEY (`brand_profile_id`) REFERENCES `developer_brand_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_brand_partnerships_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_brand_partnerships_updated_by`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `distribution_development_access` (
  `id` int NOT NULL AUTO_INCREMENT,
  `development_id` int NOT NULL,
  `brand_partnership_id` int NOT NULL,
  `brand_profile_id` int NOT NULL,
  `status` enum('listed','included','excluded','paused') NOT NULL DEFAULT 'listed',
  `submission_allowed` tinyint(1) NOT NULL DEFAULT 0,
  `excluded_by_mandate` tinyint(1) NOT NULL DEFAULT 0,
  `excluded_by_exclusivity` tinyint(1) NOT NULL DEFAULT 0,
  `reason_code` varchar(80) DEFAULT NULL,
  `notes` text,
  `included_at` timestamp NULL DEFAULT NULL,
  `excluded_at` timestamp NULL DEFAULT NULL,
  `paused_at` timestamp NULL DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_development_access_development` (`development_id`),
  KEY `idx_distribution_development_access_partnership` (`brand_partnership_id`),
  KEY `idx_distribution_development_access_brand` (`brand_profile_id`),
  KEY `idx_distribution_development_access_status` (`status`),
  KEY `idx_distribution_development_access_submit` (`submission_allowed`),
  CONSTRAINT `fk_distribution_development_access_development`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_development_access_partnership`
    FOREIGN KEY (`brand_partnership_id`) REFERENCES `distribution_brand_partnerships` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_development_access_brand_profile`
    FOREIGN KEY (`brand_profile_id`) REFERENCES `developer_brand_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_development_access_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_development_access_updated_by`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

INSERT INTO `distribution_brand_partnerships` (
  `brand_profile_id`,
  `status`,
  `partnered_at`
)
SELECT DISTINCT
  COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) AS brand_profile_id,
  'active',
  CURRENT_TIMESTAMP
FROM `distribution_programs` p
INNER JOIN `developments` d
  ON d.`id` = p.`development_id`
WHERE COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `distribution_brand_partnerships` existing
    WHERE existing.`brand_profile_id` = COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`)
  );

INSERT INTO `distribution_brand_partnerships` (
  `brand_profile_id`,
  `status`
)
SELECT DISTINCT
  COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) AS brand_profile_id,
  'pending'
FROM `developments` d
WHERE COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) IS NOT NULL
  AND d.`isPublished` = 1
  AND d.`approval_status` = 'approved'
  AND NOT EXISTS (
    SELECT 1
    FROM `distribution_brand_partnerships` existing
    WHERE existing.`brand_profile_id` = COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`)
  );

INSERT INTO `distribution_development_access` (
  `development_id`,
  `brand_partnership_id`,
  `brand_profile_id`,
  `status`,
  `submission_allowed`,
  `included_at`
)
SELECT
  d.`id`,
  bp.`id`,
  bp.`brand_profile_id`,
  'included',
  CASE
    WHEN p.`is_active` = 1 AND p.`is_referral_enabled` = 1 THEN 1
    ELSE 0
  END,
  CURRENT_TIMESTAMP
FROM `distribution_programs` p
INNER JOIN `developments` d
  ON d.`id` = p.`development_id`
INNER JOIN `distribution_brand_partnerships` bp
  ON bp.`brand_profile_id` = COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`)
WHERE COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `distribution_development_access` existing
    WHERE existing.`development_id` = d.`id`
  );

INSERT INTO `distribution_development_access` (
  `development_id`,
  `brand_partnership_id`,
  `brand_profile_id`,
  `status`,
  `submission_allowed`
)
SELECT
  d.`id`,
  bp.`id`,
  bp.`brand_profile_id`,
  'listed',
  0
FROM `developments` d
INNER JOIN `distribution_brand_partnerships` bp
  ON bp.`brand_profile_id` = COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`)
WHERE COALESCE(d.`developer_brand_profile_id`, d.`marketing_brand_profile_id`) IS NOT NULL
  AND d.`isPublished` = 1
  AND d.`approval_status` = 'approved'
  AND NOT EXISTS (
    SELECT 1
    FROM `distribution_development_access` existing
    WHERE existing.`development_id` = d.`id`
  );
