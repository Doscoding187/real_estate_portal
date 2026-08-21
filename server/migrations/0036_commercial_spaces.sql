CREATE TABLE `commercial_spaces` (
  `id` int NOT NULL AUTO_INCREMENT,
  `commercial_asset_id` int NOT NULL,
  `space_class` enum('office','industrial_logistics','retail','mixed_use','other') NOT NULL,
  `space_kind` enum('office_suite','warehouse','retail_unit','whole_building','yard','other') NOT NULL,
  `identifier` varchar(255) NOT NULL,
  `rentable_area_m2` decimal(14,2),
  `usable_area_m2` decimal(14,2),
  `lifecycle_status` enum('active','retired') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_commercial_spaces_asset_identifier` UNIQUE (`commercial_asset_id`,`identifier`),
  CONSTRAINT `fk_commercial_spaces_asset` FOREIGN KEY (`commercial_asset_id`) REFERENCES `commercial_assets` (`id`) ON DELETE RESTRICT,
  KEY `idx_commercial_spaces_class_status` (`space_class`,`lifecycle_status`)
);
