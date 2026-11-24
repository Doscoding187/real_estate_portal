CREATE TABLE `sl_responsible_parties` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `place_id` INT NOT NULL,
  `party_role` ENUM('owner','landlord','operator') NOT NULL,
  `user_id` INT NULL,
  `display_name` VARCHAR(160) NOT NULL,
  `contact_email` VARCHAR(320) NULL,
  `contact_phone` VARCHAR(32) NULL,
  `created_by_user_id` INT NOT NULL,
  `is_current` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sl_responsible_parties_place` (`place_id`,`is_current`),
  KEY `idx_sl_responsible_parties_user` (`user_id`),
  CONSTRAINT `fk_sl_responsible_parties_place` FOREIGN KEY (`place_id`) REFERENCES `sl_places` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sl_responsible_parties_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sl_responsible_parties_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);
