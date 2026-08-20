CREATE TABLE `land_verification_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assertion_id` int NOT NULL,
  `event_type` enum('created','reviewed','superseded','contradicted','expired','withdrawn','recheck_scheduled') NOT NULL,
  `actor_user_id` int,
  `event_data` json,
  `occurred_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_land_verification_events_assertion` FOREIGN KEY (`assertion_id`) REFERENCES `land_verification_assertions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_land_verification_events_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  KEY `idx_land_verification_events_assertion_time` (`assertion_id`,`occurred_at`)
);
