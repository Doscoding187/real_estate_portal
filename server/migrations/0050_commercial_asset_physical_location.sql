ALTER TABLE `commercial_assets`
  ADD COLUMN `private_address` JSON NULL,
  ADD COLUMN `latitude` DECIMAL(10,7) NULL,
  ADD COLUMN `longitude` DECIMAL(10,7) NULL,
  ADD COLUMN `provider_location_place_id` VARCHAR(255) NULL,
  ADD COLUMN `coordinate_source` ENUM('autocomplete','map','manual_confirmed') NULL,
  ADD COLUMN `location_confirmation_state` ENUM('confirmed','needs_confirmation') NOT NULL DEFAULT 'needs_confirmation',
  ADD COLUMN `public_location_precision` ENUM('approximate','exact') NOT NULL DEFAULT 'approximate',
  ADD COLUMN `location_confirmed_by_user_id` INT NULL,
  ADD COLUMN `location_confirmed_at` TIMESTAMP NULL;

CREATE INDEX `idx_commercial_assets_location_confirmation`
  ON `commercial_assets` (`location_confirmation_state`);

ALTER TABLE `commercial_assets`
  ADD CONSTRAINT `fk_commercial_assets_location_confirmed_by`
  FOREIGN KEY (`location_confirmed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
