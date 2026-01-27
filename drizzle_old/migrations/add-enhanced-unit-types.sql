-- Enhanced Unit Types Table
-- Supports comprehensive unit configuration with specifications, media, and upgrades

CREATE TABLE IF NOT EXISTS `unit_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `development_id` INT NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  
  -- Basic Configuration
  `ownership_type` ENUM('full-title', 'sectional-title', 'leasehold', 'life-rights') NOT NULL DEFAULT 'sectional-title',
  `structural_type` ENUM('apartment', 'freestanding-house', 'simplex', 'duplex', 'penthouse', 'plot-and-plan', 'townhouse', 'studio') NOT NULL DEFAULT 'apartment',
  `bedrooms` INT NOT NULL DEFAULT 0,
  `bathrooms` DECIMAL(3,1) NOT NULL DEFAULT 0,
  `floors` ENUM('single-storey', 'double-storey', 'triplex') NULL,
  
  -- Sizes
  `unit_size` INT NULL COMMENT 'Floor size in square meters',
  `yard_size` INT NULL COMMENT 'Yard/garden size in square meters',
  
  -- Pricing
  `price_from` DECIMAL(15,2) NOT NULL,
  `price_to` DECIMAL(15,2) NULL,
  
  -- Parking
  `parking` ENUM('none', '1', '2', 'carport', 'garage') DEFAULT 'none',
  
  -- Availability
  `available_units` INT NOT NULL DEFAULT 0,
  `completion_date` DATE NULL,
  `deposit_required` DECIMAL(15,2) NULL,
  `internal_notes` TEXT NULL,
  
  -- Description & Media
  `config_description` TEXT NULL,
  `virtual_tour_link` VARCHAR(500) NULL,
  
  -- Specification Overrides (JSON)
  `spec_overrides` JSON NULL COMMENT 'Which specs are overridden from master',
  `kitchen_finish` VARCHAR(255) NULL,
  `countertop_material` VARCHAR(255) NULL,
  `flooring_type` VARCHAR(255) NULL,
  `bathroom_fixtures` VARCHAR(255) NULL,
  `wall_finish` VARCHAR(255) NULL,
  `energy_efficiency` VARCHAR(255) NULL,
  
  -- Custom Specifications (JSON Array)
  `custom_specs` JSON NULL COMMENT 'Array of {name, value} custom specifications',
  
  -- Upgrade Packs (JSON Array)
  `upgrade_packs` JSON NULL COMMENT 'Array of {id, name, description, price} upgrade options',
  
  -- Media (JSON Array)
  `unit_media` JSON NULL COMMENT 'Array of media items with category, type, url',
  
  -- Metadata
  `display_order` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_development_id` (`development_id`),
  INDEX `idx_price_range` (`price_from`, `price_to`),
  INDEX `idx_bedrooms_bathrooms` (`bedrooms`, `bathrooms`),
  INDEX `idx_structural_type` (`structural_type`),
  INDEX `idx_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to table
ALTER TABLE `unit_types` COMMENT = 'Enhanced unit type configurations with specifications inheritance and media support';
