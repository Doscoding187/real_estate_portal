CREATE TABLE `land_listing_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `land_asset_id` int NOT NULL,
  `listing_id` int NOT NULL,
  `link_status` enum('active','ended') NOT NULL DEFAULT 'active',
  `linked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` timestamp NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_land_listing_links_listing` UNIQUE (`listing_id`),
  CONSTRAINT `fk_land_listing_links_asset` FOREIGN KEY (`land_asset_id`) REFERENCES `land_assets` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_land_listing_links_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE RESTRICT,
  KEY `idx_land_listing_links_asset_status` (`land_asset_id`,`link_status`)
);
