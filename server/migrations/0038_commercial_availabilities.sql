CREATE TABLE `commercial_availabilities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `commercial_space_id` int NOT NULL,
  `transaction_type` enum('lease','sale') NOT NULL,
  `availability_state` enum('available_confirmed','available_upcoming','under_offer','needs_reconfirmation','occupied','withdrawn') NOT NULL,
  `occupation_date` date,
  `last_confirmed_at` timestamp NULL,
  `confirmation_source` enum('broker','landlord','owner','asset_manager','property_fund','other'),
  `confirmation_source_label` varchar(255),
  `confirmed_by_user_id` int,
  `reconfirmation_due_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_commercial_availabilities_space` FOREIGN KEY (`commercial_space_id`) REFERENCES `commercial_spaces` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_commercial_availabilities_confirmed_by` FOREIGN KEY (`confirmed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  KEY `idx_commercial_availabilities_space_state` (`commercial_space_id`,`availability_state`),
  KEY `idx_commercial_availabilities_reconfirmation` (`reconfirmation_due_at`)
);
