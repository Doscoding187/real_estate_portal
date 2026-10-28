ALTER TABLE `sl_places`
  DROP FOREIGN KEY `fk_sl_places_province`,
  DROP FOREIGN KEY `fk_sl_places_city`,
  DROP FOREIGN KEY `fk_sl_places_suburb`,
  DROP INDEX `idx_sl_places_suburb`,
  DROP INDEX `idx_sl_places_city`,
  DROP INDEX `idx_sl_places_province`,
  DROP COLUMN `province_id`,
  DROP COLUMN `city_id`,
  DROP COLUMN `suburb_id`,
  ADD COLUMN `canonical_place_id` varchar(40) NULL AFTER `address_line_private`;
