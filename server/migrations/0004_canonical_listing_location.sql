-- PLE-6B: canonical geography lifecycle, provider evidence, and private/public location boundaries.
-- This is an approved exceptional migration because the bounded additive change spans existing tables and one new mapping table.

ALTER TABLE `provinces`
  ADD COLUMN `status` enum('verified','provisional','retired') NOT NULL DEFAULT 'verified',
  ADD COLUMN `origin` enum('internal','provider','manual') NOT NULL DEFAULT 'internal',
  ADD INDEX `idx_provinces_status` (`status`);

ALTER TABLE `cities`
  ADD COLUMN `status` enum('verified','provisional','retired') NOT NULL DEFAULT 'verified',
  ADD COLUMN `origin` enum('internal','provider','manual') NOT NULL DEFAULT 'internal',
  ADD INDEX `idx_cities_status` (`status`);

ALTER TABLE `suburbs`
  ADD COLUMN `status` enum('verified','provisional','retired') NOT NULL DEFAULT 'verified',
  ADD COLUMN `origin` enum('internal','provider','manual') NOT NULL DEFAULT 'internal',
  ADD INDEX `idx_suburbs_status` (`status`);

CREATE TABLE `location_provider_mappings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `provider` varchar(32) NOT NULL,
  `provider_place_id` varchar(255) NOT NULL,
  `provider_label` varchar(255) NOT NULL,
  `normalized_alias` varchar(255) NOT NULL,
  `province_id` int,
  `city_id` int,
  `suburb_id` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `location_provider_mappings_id` PRIMARY KEY(`id`),
  CONSTRAINT `location_provider_mappings_provider_place_uq` UNIQUE(`provider`,`provider_place_id`),
  CONSTRAINT `location_provider_mappings_exactly_one_target` CHECK (
    (`province_id` IS NOT NULL) + (`city_id` IS NOT NULL) + (`suburb_id` IS NOT NULL) = 1
  ),
  CONSTRAINT `location_provider_mappings_province_fk`
    FOREIGN KEY (`province_id`) REFERENCES `provinces`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT `location_provider_mappings_city_fk`
    FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT `location_provider_mappings_suburb_fk`
    FOREIGN KEY (`suburb_id`) REFERENCES `suburbs`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
  INDEX `idx_location_provider_mappings_alias` (`provider`,`normalized_alias`),
  INDEX `idx_location_provider_mappings_province` (`province_id`),
  INDEX `idx_location_provider_mappings_city` (`city_id`),
  INDEX `idx_location_provider_mappings_suburb` (`suburb_id`)
);

ALTER TABLE `listings`
  MODIFY COLUMN `address` text NULL,
  ADD COLUMN `province_id` int NULL,
  ADD COLUMN `city_id` int NULL,
  ADD COLUMN `suburb_id` int NULL,
  ADD COLUMN `private_address` json NULL,
  ADD COLUMN `coordinate_source` enum('autocomplete','map','manual_confirmed') NULL,
  ADD COLUMN `location_confirmation_state` enum('confirmed','needs_confirmation') NOT NULL DEFAULT 'needs_confirmation',
  ADD COLUMN `public_location_precision` enum('approximate','exact') NOT NULL DEFAULT 'approximate',
  ADD INDEX `idx_listings_province_id` (`province_id`),
  ADD INDEX `idx_listings_city_id` (`city_id`),
  ADD INDEX `idx_listings_suburb_id` (`suburb_id`),
  ADD CONSTRAINT `listings_province_id_fk`
    FOREIGN KEY (`province_id`) REFERENCES `provinces`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `listings_city_id_fk`
    FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `listings_suburb_id_fk`
    FOREIGN KEY (`suburb_id`) REFERENCES `suburbs`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE `properties`
  ADD COLUMN `public_address` text NULL,
  ADD COLUMN `public_latitude` decimal(10,7) NULL,
  ADD COLUMN `public_longitude` decimal(10,7) NULL,
  ADD COLUMN `public_location_precision` enum('approximate','exact') NOT NULL DEFAULT 'approximate';
