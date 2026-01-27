-- Create units table for inventory management

CREATE TABLE IF NOT EXISTS `development_units` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `development_id` int NOT NULL,
  `phase_id` int,
  `unit_number` varchar(100) NOT NULL,
  `unit_type` enum('studio', '1bed', '2bed', '3bed', '4bed+', 'penthouse', 'townhouse', 'house') NOT NULL,
  `bedrooms` int,
  `bathrooms` decimal(3,1),
  `size` decimal(10,2) COMMENT 'Size in square meters',
  `price` decimal(12,2) NOT NULL,
  `floor_plan` text COMMENT 'S3 URL',
  `floor` int,
  `facing` varchar(50),
  `features` text COMMENT 'JSON array',
  `status` enum('available', 'reserved', 'sold') DEFAULT 'available' NOT NULL,
  `reserved_at` timestamp NULL,
  `reserved_by` int COMMENT 'leadId',
  `sold_at` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`phase_id`) REFERENCES `development_phases`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_unit_per_development` (`development_id`, `unit_number`)
);

-- Create indexes for performance
CREATE INDEX `idx_units_development_id` ON `development_units`(`development_id`);
CREATE INDEX `idx_units_phase_id` ON `development_units`(`phase_id`);
CREATE INDEX `idx_units_status` ON `development_units`(`status`);
CREATE INDEX `idx_units_unit_type` ON `development_units`(`unit_type`);
CREATE INDEX `idx_units_price` ON `development_units`(`price`);
