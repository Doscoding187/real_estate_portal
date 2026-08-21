CREATE TABLE `commercial_lead_contexts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lead_id` INT NOT NULL,
  `commercial_asset_id` INT NOT NULL,
  `commercial_space_id` INT NOT NULL,
  `commercial_availability_id` INT NOT NULL,
  `listing_id` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_commercial_lead_contexts_lead` (`lead_id`),
  KEY `idx_commercial_lead_contexts_availability` (`commercial_availability_id`),
  CONSTRAINT `fk_commercial_lead_contexts_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_commercial_lead_contexts_asset` FOREIGN KEY (`commercial_asset_id`) REFERENCES `commercial_assets` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_commercial_lead_contexts_space` FOREIGN KEY (`commercial_space_id`) REFERENCES `commercial_spaces` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_commercial_lead_contexts_availability` FOREIGN KEY (`commercial_availability_id`) REFERENCES `commercial_availabilities` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_commercial_lead_contexts_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE RESTRICT
);
