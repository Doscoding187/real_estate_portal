CREATE TABLE `economic_actors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `actor_type` ENUM('agent', 'developer', 'contractor', 'finance_partner') NOT NULL,
  `verification_status` ENUM('unverified', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'unverified',
  `subscription_tier` ENUM('free', 'starter', 'pro', 'enterprise') NOT NULL DEFAULT 'free',
  `trust_score` DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  `momentum_score` DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  `profile_completeness` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_economic_actors_user_type` (`user_id`, `actor_type`),
  KEY `idx_economic_actors_actor_type` (`actor_type`),
  KEY `idx_economic_actors_trust_score` (`trust_score`),
  CONSTRAINT `fk_economic_actors_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE `agent_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor_id` INT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_agent_profiles_actor_id` (`actor_id`),
  CONSTRAINT `fk_agent_profiles_actor_id` FOREIGN KEY (`actor_id`) REFERENCES `economic_actors` (`id`) ON DELETE CASCADE
);

CREATE TABLE `developer_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor_id` INT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_developer_profiles_actor_id` (`actor_id`),
  CONSTRAINT `fk_developer_profiles_actor_id` FOREIGN KEY (`actor_id`) REFERENCES `economic_actors` (`id`) ON DELETE CASCADE
);

CREATE TABLE `contractor_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor_id` INT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_contractor_profiles_actor_id` (`actor_id`),
  CONSTRAINT `fk_contractor_profiles_actor_id` FOREIGN KEY (`actor_id`) REFERENCES `economic_actors` (`id`) ON DELETE CASCADE
);

CREATE TABLE `finance_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor_id` INT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_finance_profiles_actor_id` (`actor_id`),
  CONSTRAINT `fk_finance_profiles_actor_id` FOREIGN KEY (`actor_id`) REFERENCES `economic_actors` (`id`) ON DELETE CASCADE
);

ALTER TABLE `explore_content`
  ADD COLUMN `actor_id` INT NULL AFTER `reference_id`;

ALTER TABLE `explore_content`
  ADD COLUMN `category` ENUM('property', 'renovation', 'finance', 'investment', 'services') NOT NULL DEFAULT 'property' AFTER `lifestyle_categories`;

ALTER TABLE `explore_content`
  ADD COLUMN `duration_sec` INT NULL AFTER `category`;

ALTER TABLE `explore_content`
  ADD COLUMN `width` INT NULL AFTER `duration_sec`;

ALTER TABLE `explore_content`
  ADD COLUMN `height` INT NULL AFTER `width`;

ALTER TABLE `explore_content`
  ADD COLUMN `orientation` ENUM('vertical', 'horizontal', 'square') NULL DEFAULT 'vertical' AFTER `height`;

ALTER TABLE `explore_content`
  ADD KEY `idx_explore_content_actor_id` (`actor_id`);

ALTER TABLE `explore_content`
  ADD KEY `idx_explore_content_category` (`category`);

ALTER TABLE `explore_content`
  ADD CONSTRAINT `fk_explore_content_actor_id` FOREIGN KEY (`actor_id`) REFERENCES `economic_actors` (`id`) ON DELETE SET NULL;

INSERT INTO `economic_actors` (
  `user_id`,
  `actor_type`,
  `verification_status`,
  `subscription_tier`,
  `trust_score`,
  `momentum_score`,
  `profile_completeness`,
  `created_at`,
  `updated_at`
)
SELECT DISTINCT
  u.`id` AS user_id,
  CASE
    WHEN u.`role` = 'property_developer' THEN 'developer'
    WHEN u.`role` = 'agent' THEN 'agent'
    ELSE 'contractor'
  END AS actor_type,
  CASE
    WHEN u.`role` IN ('agent', 'property_developer') THEN 'pending'
    ELSE 'unverified'
  END AS verification_status,
  'free' AS subscription_tier,
  50.00 AS trust_score,
  0.00 AS momentum_score,
  CASE
    WHEN u.`role` IN ('agent', 'property_developer') THEN 35
    ELSE 20
  END AS profile_completeness,
  NOW(),
  NOW()
FROM `users` u
INNER JOIN `explore_content` ec ON ec.`creator_id` = u.`id`
WHERE ec.`creator_id` IS NOT NULL
ON DUPLICATE KEY UPDATE
  `updated_at` = VALUES(`updated_at`);

UPDATE `explore_content` ec
INNER JOIN `users` u ON u.`id` = ec.`creator_id`
INNER JOIN `economic_actors` ea
  ON ea.`user_id` = u.`id`
  AND ea.`actor_type` = CASE
    WHEN ec.`creator_type` = 'developer' THEN 'developer'
    WHEN ec.`creator_type` = 'agent' THEN 'agent'
    WHEN u.`role` = 'property_developer' THEN 'developer'
    WHEN u.`role` = 'agent' THEN 'agent'
    ELSE 'contractor'
  END
SET ec.`actor_id` = ea.`id`
WHERE ec.`creator_id` IS NOT NULL
  AND ec.`actor_id` IS NULL;

CREATE TABLE `interaction_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `content_id` INT NOT NULL,
  `actor_id` INT NULL,
  `viewer_user_id` INT NULL,
  `event_type` ENUM(
    'impression',
    'viewProgress',
    'viewComplete',
    'like',
    'save',
    'share',
    'profileClick',
    'listingOpen',
    'contactClick',
    'notInterested',
    'report'
  ) NOT NULL,
  `watch_ms` INT NULL,
  `session_id` VARCHAR(128) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_interaction_events_content_id` (`content_id`),
  KEY `idx_interaction_events_actor_id` (`actor_id`),
  KEY `idx_interaction_events_event_type` (`event_type`),
  KEY `idx_interaction_events_session_id` (`session_id`),
  KEY `idx_interaction_events_created_at` (`created_at`),
  CONSTRAINT `fk_interaction_events_content_id` FOREIGN KEY (`content_id`) REFERENCES `explore_content` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_interaction_events_actor_id` FOREIGN KEY (`actor_id`) REFERENCES `economic_actors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_interaction_events_viewer_user_id` FOREIGN KEY (`viewer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- DOWN (manual rollback only)
-- DROP TABLE IF EXISTS `interaction_events`;
-- ALTER TABLE `explore_content` DROP FOREIGN KEY `fk_explore_content_actor_id`;
-- ALTER TABLE `explore_content` DROP COLUMN `orientation`, DROP COLUMN `height`, DROP COLUMN `width`, DROP COLUMN `duration_sec`, DROP COLUMN `category`, DROP COLUMN `actor_id`;
-- DROP TABLE IF EXISTS `finance_profiles`;
-- DROP TABLE IF EXISTS `contractor_profiles`;
-- DROP TABLE IF EXISTS `developer_profiles`;
-- DROP TABLE IF EXISTS `agent_profiles`;
-- DROP TABLE IF EXISTS `economic_actors`;
