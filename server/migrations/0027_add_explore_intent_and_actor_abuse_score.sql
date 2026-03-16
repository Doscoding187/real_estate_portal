ALTER TABLE `economic_actors`
  ADD COLUMN `abuse_score` DECIMAL(5,2) NOT NULL DEFAULT 50.00 AFTER `momentum_score`,
  ADD KEY `idx_economic_actors_abuse_score` (`abuse_score`);

CREATE TABLE `explore_user_intents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `intent` ENUM('buy', 'sell', 'improve', 'invest', 'learn') NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_explore_user_intents_user_id` (`user_id`),
  KEY `idx_explore_user_intents_intent` (`intent`),
  CONSTRAINT `fk_explore_user_intents_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

