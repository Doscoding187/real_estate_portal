CREATE TABLE `sl_place_household` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `place_id` INT NOT NULL,
  `occupants_count` INT NULL,
  `occupants_type` ENUM('professionals','students','family','mixed','unknown') NOT NULL DEFAULT 'unknown',
  `smoking` ENUM('non_smoking','outdoors_only','smoking_allowed','unknown') NOT NULL DEFAULT 'unknown',
  `pets` ENUM('none','present','considered','unknown') NOT NULL DEFAULT 'unknown',
  `visitors` ENUM('allowed','restricted','no_visitors') NOT NULL DEFAULT 'allowed',
  `cleaning` ENUM('rota','cleaner','none','unknown') NOT NULL DEFAULT 'unknown',
  `gender_composition` VARCHAR(60) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sl_place_household_place` (`place_id`),
  CONSTRAINT `fk_sl_place_household_place` FOREIGN KEY (`place_id`) REFERENCES `sl_places` (`id`) ON DELETE CASCADE
);
