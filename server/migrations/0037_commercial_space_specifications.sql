CREATE TABLE `commercial_space_specifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `commercial_space_id` int NOT NULL,
  `specification_code` enum('building_grade','fit_out_condition','backup_power','backup_water','fibre_connectivity','parking_bays','eaves_height_m','yard_hardstand','truck_access','roller_doors','loading_docks','power_capacity_kva','floor_loading','sprinklers','crane_capacity','frontage_visibility','footfall_context','extraction_capability','tenant_mix_context','delivery_access') NOT NULL,
  `value_state` enum('known','unknown','unavailable','not_applicable') NOT NULL,
  `numeric_value` decimal(16,2),
  `text_value` varchar(500),
  `boolean_value` int,
  `source_label` varchar(255),
  `supplied_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_commercial_space_specifications_space_code` UNIQUE (`commercial_space_id`,`specification_code`),
  CONSTRAINT `fk_commercial_space_specifications_space` FOREIGN KEY (`commercial_space_id`) REFERENCES `commercial_spaces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_commercial_space_specifications_boolean` CHECK (`boolean_value` IS NULL OR `boolean_value` IN (0, 1))
);
