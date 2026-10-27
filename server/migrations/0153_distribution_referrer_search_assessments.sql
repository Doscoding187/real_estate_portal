CREATE TABLE `distribution_referrer_search_assessments` (
  `id` varchar(36) NOT NULL,
  `owner_user_id` int DEFAULT NULL,
  `continuity_token_hash` varchar(64) NOT NULL,
  `market_mode` enum('sale', 'rent') NOT NULL,
  `search_policy_version` varchar(64) NOT NULL,
  `search_filters_json` json NOT NULL,
  `selected_opportunities_json` json NOT NULL,
  `claimed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_referrer_search_assessment_token` (`continuity_token_hash`),
  KEY `idx_distribution_referrer_search_assessment_owner_updated` (`owner_user_id`, `updated_at`),
  CONSTRAINT `fk_distribution_referrer_search_assessments_owner`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
