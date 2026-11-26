ALTER TABLE `sl_places`
  ADD COLUMN `publication_status` ENUM('draft','pending_review','approved','published','rejected','held','paused','archived') NOT NULL DEFAULT 'draft',
  ADD KEY `idx_sl_places_publication` (`publication_status`,`canonical_place_id`);
