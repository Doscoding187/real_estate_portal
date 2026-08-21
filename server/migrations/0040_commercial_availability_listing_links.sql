CREATE TABLE `commercial_availability_listing_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `commercial_availability_id` int NOT NULL,
  `listing_id` int NOT NULL,
  `link_status` enum('active','ended') NOT NULL DEFAULT 'active',
  `linked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` timestamp NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_commercial_availability_listing_links_listing` UNIQUE (`listing_id`),
  CONSTRAINT `fk_commercial_availability_listing_links_availability` FOREIGN KEY (`commercial_availability_id`) REFERENCES `commercial_availabilities` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_commercial_availability_listing_links_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE RESTRICT,
  KEY `idx_commercial_availability_listing_links_availability` (`commercial_availability_id`,`link_status`)
);
