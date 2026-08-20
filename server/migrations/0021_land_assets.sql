CREATE TABLE `land_assets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `classification` enum('residential_stand','development_land','commercial_industrial_land','agricultural_vacant_land','smallholding','farm','other_land') NOT NULL,
  `intended_use` varchar(120),
  `development_context` text,
  `public_location_precision` enum('approximate','exact') NOT NULL DEFAULT 'approximate',
  `lifecycle_status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
  `created_by_user_id` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_land_assets_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  KEY `idx_land_assets_classification_status` (`classification`,`lifecycle_status`)
);
