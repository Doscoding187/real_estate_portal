CREATE TABLE `sl_listing_authority_events` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `authority_id` INT NOT NULL,
  `event_type` ENUM('submitted','approved','rejected','revoked','expired','superseded') NOT NULL,
  `actor_user_id` INT NULL,
  `previous_status` VARCHAR(32) NULL,
  `next_status` VARCHAR(32) NOT NULL,
  `reason` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sl_listing_authority_events_authority` (`authority_id`,`created_at`),
  CONSTRAINT `fk_sl_listing_authority_events_authority` FOREIGN KEY (`authority_id`) REFERENCES `sl_listing_authorities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sl_listing_authority_events_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
