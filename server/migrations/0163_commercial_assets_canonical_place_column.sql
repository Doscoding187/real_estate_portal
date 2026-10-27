ALTER TABLE `commercial_assets`
  DROP FOREIGN KEY `fk_commercial_assets_province`,
  DROP FOREIGN KEY `fk_commercial_assets_city`,
  DROP FOREIGN KEY `fk_commercial_assets_suburb`,
  DROP INDEX `idx_commercial_assets_geography`,
  DROP COLUMN `province_id`,
  DROP COLUMN `city_id`,
  DROP COLUMN `suburb_id`,
  ADD COLUMN `canonical_place_id` varchar(40) NULL;
