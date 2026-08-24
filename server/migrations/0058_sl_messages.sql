CREATE TABLE `sl_messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lead_id` INT NOT NULL,
  `sender_user_id` INT NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sl_messages_lead_created` (`lead_id`,`created_at`),
  CONSTRAINT `fk_sl_messages_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sl_messages_sender` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);
