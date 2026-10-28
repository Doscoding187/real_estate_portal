ALTER TABLE `land_parcels`
  DROP FOREIGN KEY `fk_land_parcels_province`,
  DROP FOREIGN KEY `fk_land_parcels_city`,
  DROP FOREIGN KEY `fk_land_parcels_suburb`,
  DROP INDEX `idx_land_parcels_geography`,
  DROP COLUMN `province_id`,
  DROP COLUMN `city_id`,
  DROP COLUMN `suburb_id`,
  ADD COLUMN `canonical_place_id` varchar(40) NULL AFTER `jurisdiction_country_code`;
