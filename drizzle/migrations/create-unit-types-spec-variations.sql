-- Unit Types & Spec Variations Tables
-- Supports 3-tab structure: Base Configuration, Specs & Variations, Media
-- Implements specification inheritance model

-- ============================================
-- UNIT TYPES TABLE (Base Configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS `unit_types` (
  `id` VARCHAR(36) PRIMARY KEY,
  `development_id` INT NOT NULL,
  
  -- Basic Configuration (Tab A)
  `name` VARCHAR(255) NOT NULL COMMENT 'e.g., "2 Bedroom Apartment", "60m² Simplex"',
  `bedrooms` INT NOT NULL,
  `bathrooms` DECIMAL(3,1) NOT NULL,
  `parking` ENUM('none', '1', '2', 'carport', 'garage') DEFAULT 'none',
  `unit_size` INT NULL COMMENT 'Floor size in m²',
  `yard_size` INT NULL COMMENT 'Yard size in m²',
  `base_price_from` DECIMAL(15,2) NOT NULL,
  `base_price_to` DECIMAL(15,2) NULL,
  
  -- Base Features (Defaults for all specs)
  `base_features` JSON NULL COMMENT '{builtInWardrobes, tiledFlooring, graniteCounters, prepaidElectricity, balcony, petFriendly}',
  
  -- Base Finishes
  `base_finishes` JSON NULL COMMENT '{paintAndWalls, flooringTypes, kitchenFeatures, bathroomFeatures}',
  
  -- Base Media (Inherited by all specs)
  `base_media` JSON NULL COMMENT '{gallery: [], floorPlans: [], renders: []}',
  
  -- Metadata
  `display_order` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_unit_types_development_id` (`development_id`),
  INDEX `idx_unit_types_price_range` (`base_price_from`, `base_price_to`),
  INDEX `idx_unit_types_bedrooms_bathrooms` (`bedrooms`, `bathrooms`),
  INDEX `idx_unit_types_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Unit type base configurations with inheritance support';

-- ============================================
-- SPEC VARIATIONS TABLE (Tab B)
-- ============================================
CREATE TABLE IF NOT EXISTS `spec_variations` (
  `id` VARCHAR(36) PRIMARY KEY,
  `unit_type_id` VARCHAR(36) NOT NULL,
  
  -- Basic Info
  `name` VARCHAR(255) NOT NULL COMMENT 'e.g., "Standard Spec", "GAP Spec", "Premium Spec"',
  `price` DECIMAL(15,2) NOT NULL,
  `description` TEXT NULL,
  
  -- Overrides (optional - only store if different from base)
  `overrides` JSON NULL COMMENT '{bedroomsOverride, bathroomsOverride, sizeOverride}',
  
  -- Feature Overrides
  `feature_overrides` JSON NULL COMMENT '{add: [], remove: [], replace: {}}',
  
  -- Spec-Specific Media (overrides base media)
  `media` JSON NULL COMMENT '{photos: [], floorPlans: [], videos: [], pdfs: []}',
  
  -- Metadata
  `display_order` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (`unit_type_id`) REFERENCES `unit_types`(`id`) ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_spec_variations_unit_type_id` (`unit_type_id`),
  INDEX `idx_spec_variations_price` (`price`),
  INDEX `idx_spec_variations_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Spec variations with inheritance from unit type base';

-- ============================================
-- DEVELOPMENT DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `development_documents` (
  `id` VARCHAR(36) PRIMARY KEY,
  `development_id` INT NOT NULL,
  `unit_type_id` VARCHAR(36) NULL COMMENT 'NULL for development-wide docs',
  
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('brochure', 'site-plan', 'pricing-sheet', 'estate-rules', 'engineering-pack', 'other') NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `file_size` INT NULL,
  `mime_type` VARCHAR(100) NULL,
  
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`unit_type_id`) REFERENCES `unit_types`(`id`) ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_dev_docs_development_id` (`development_id`),
  INDEX `idx_dev_docs_unit_type_id` (`unit_type_id`),
  INDEX `idx_dev_docs_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Development and unit-specific documents';

