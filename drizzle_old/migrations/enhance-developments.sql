-- Enhance developments table for full profile management

-- Add new fields to developments table
ALTER TABLE `developments` 
ADD COLUMN `slug` varchar(255) UNIQUE AFTER `name`,
ADD COLUMN `floor_plans` text AFTER `videos`,
ADD COLUMN `brochures` text AFTER `floor_plans`,
ADD COLUMN `published_at` timestamp NULL AFTER `updated_at`,
ADD COLUMN `is_published` tinyint DEFAULT 0 NOT NULL AFTER `is_featured`;

-- Create development phases table
CREATE TABLE IF NOT EXISTS `development_phases` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `development_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `phase_number` int NOT NULL,
  `description` text,
  `status` enum('planning', 'pre_launch', 'selling', 'sold_out', 'completed') DEFAULT 'planning' NOT NULL,
  `total_units` int DEFAULT 0 NOT NULL,
  `available_units` int DEFAULT 0 NOT NULL,
  `price_from` int,
  `price_to` int,
  `launch_date` timestamp,
  `completion_date` timestamp,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX `idx_developments_slug` ON `developments`(`slug`);
CREATE INDEX `idx_developments_developer_id` ON `developments`(`developer_id`);
CREATE INDEX `idx_developments_published` ON `developments`(`is_published`);
CREATE INDEX `idx_development_phases_development_id` ON `development_phases`(`development_id`);
CREATE INDEX `idx_development_phases_status` ON `development_phases`(`status`);
