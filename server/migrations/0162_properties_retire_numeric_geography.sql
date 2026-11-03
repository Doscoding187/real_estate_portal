ALTER TABLE `properties`
  DROP FOREIGN KEY `properties_location_id_locations_id_fk`,
  DROP FOREIGN KEY `properties_provinceId_provinces_id_fk`,
  DROP FOREIGN KEY `properties_cityId_cities_id_fk`,
  DROP FOREIGN KEY `properties_suburbId_suburbs_id_fk`,
  DROP INDEX `idx_properties_location_id`,
  DROP INDEX `idx_properties_cityId`,
  DROP INDEX `idx_properties_suburbId`,
  DROP INDEX `idx_properties_cityId_status`,
  DROP INDEX `idx_properties_cityId_area`,
  DROP COLUMN `location_id`,
  DROP COLUMN `provinceId`,
  DROP COLUMN `cityId`,
  DROP COLUMN `suburbId`;
