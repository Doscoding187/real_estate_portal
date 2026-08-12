CREATE TABLE `development_supersessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `source_development_id` int NOT NULL,
  `replacement_development_id` int NOT NULL,
  `status` enum('verified','active','reversed') NOT NULL,
  `verification_note` varchar(1000) NOT NULL,
  `verified_by_actor_id` int NOT NULL,
  `verified_at` timestamp NOT NULL,
  `activated_by_actor_id` int NULL,
  `activated_at` timestamp NULL,
  `source_public_root_path` varchar(512) NULL,
  `reversed_by_actor_id` int NULL,
  `reversed_at` timestamp NULL,
  `reversal_reason` varchar(1000) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_development_supersessions_pair` (`source_development_id`, `replacement_development_id`),
  UNIQUE KEY `uq_development_supersessions_source_path` (`source_public_root_path`),
  KEY `idx_development_supersessions_source_status` (`source_development_id`, `status`),
  KEY `idx_development_supersessions_replacement_status` (`replacement_development_id`, `status`),
  CONSTRAINT `fk_development_supersessions_source_development`
    FOREIGN KEY (`source_development_id`) REFERENCES `developments` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_development_supersessions_replacement_development`
    FOREIGN KEY (`replacement_development_id`) REFERENCES `developments` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_development_supersessions_verified_actor`
    FOREIGN KEY (`verified_by_actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_development_supersessions_activated_actor`
    FOREIGN KEY (`activated_by_actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_development_supersessions_reversed_actor`
    FOREIGN KEY (`reversed_by_actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_development_supersessions_distinct_endpoints`
    CHECK (`source_development_id` <> `replacement_development_id`),
  CONSTRAINT `chk_development_supersessions_verification_note`
    CHECK (CHAR_LENGTH(TRIM(`verification_note`)) > 0),
  CONSTRAINT `chk_development_supersessions_source_path`
    CHECK (`source_public_root_path` IS NULL OR CHAR_LENGTH(TRIM(`source_public_root_path`)) > 0),
  CONSTRAINT `chk_development_supersessions_verified_shape`
    CHECK (`status` <> 'verified' OR (
      `activated_by_actor_id` IS NULL
      AND `activated_at` IS NULL
      AND `source_public_root_path` IS NULL
      AND `reversed_by_actor_id` IS NULL
      AND `reversed_at` IS NULL
      AND `reversal_reason` IS NULL
    )),
  CONSTRAINT `chk_development_supersessions_active_shape`
    CHECK (`status` <> 'active' OR (
      `activated_by_actor_id` IS NOT NULL
      AND `activated_at` IS NOT NULL
      AND `source_public_root_path` IS NOT NULL
      AND `reversed_by_actor_id` IS NULL
      AND `reversed_at` IS NULL
      AND `reversal_reason` IS NULL
    )),
  CONSTRAINT `chk_development_supersessions_reversed_shape`
    CHECK (`status` <> 'reversed' OR (
      `reversed_by_actor_id` IS NOT NULL
      AND `reversed_at` IS NOT NULL
      AND CHAR_LENGTH(TRIM(`reversal_reason`)) > 0
    )),
  CONSTRAINT `chk_development_supersessions_activation_triplet`
    CHECK (
      (`activated_by_actor_id` IS NULL
        AND `activated_at` IS NULL
        AND `source_public_root_path` IS NULL)
      OR
      (`activated_by_actor_id` IS NOT NULL
        AND `activated_at` IS NOT NULL
        AND `source_public_root_path` IS NOT NULL)
    ),
  CONSTRAINT `chk_development_supersessions_activation_order`
    CHECK (`activated_at` IS NULL OR `activated_at` >= `verified_at`),
  CONSTRAINT `chk_development_supersessions_reversal_order`
    CHECK (`reversed_at` IS NULL OR `reversed_at` >= `verified_at`)
);
