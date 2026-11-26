ALTER TABLE `sl_spaces`
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `availability_status` ENUM('available','occupied','unavailable') NOT NULL DEFAULT 'unavailable',
  ADD COLUMN `publication_status` ENUM('draft','pending_review','approved','published','rejected','held','paused','archived') NOT NULL DEFAULT 'draft',
  ADD COLUMN `occupancy_count` INT NULL,
  ADD KEY `idx_sl_spaces_publication` (`publication_status`,`availability_status`,`place_id`);
