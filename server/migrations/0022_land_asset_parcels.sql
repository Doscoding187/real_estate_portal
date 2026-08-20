CREATE TABLE `land_asset_parcels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `land_asset_id` int NOT NULL,
  `parcel_id` int NOT NULL,
  `relationship_role` enum('primary','component') NOT NULL DEFAULT 'component',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_land_asset_parcels` UNIQUE (`land_asset_id`,`parcel_id`),
  CONSTRAINT `fk_land_asset_parcels_asset` FOREIGN KEY (`land_asset_id`) REFERENCES `land_assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_land_asset_parcels_parcel` FOREIGN KEY (`parcel_id`) REFERENCES `land_parcels` (`id`) ON DELETE RESTRICT,
  KEY `idx_land_asset_parcels_parcel` (`parcel_id`)
);
