CREATE TABLE `sl_moderation_queue` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `place_id` INT NOT NULL,
  `action` ENUM('submit','approve','reject','pause','resume','archive') NOT NULL,
  `reviewer_user_id` INT NULL,
  `reason` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sl_moderation_queue_place` (`place_id`),
  KEY `idx_sl_moderation_queue_action` (`action`),
  CONSTRAINT `fk_sl_moderation_queue_place` FOREIGN KEY (`place_id`) REFERENCES `sl_places` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sl_moderation_queue_reviewer` FOREIGN KEY (`reviewer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
