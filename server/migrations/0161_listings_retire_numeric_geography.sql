ALTER TABLE `listings`
  DROP FOREIGN KEY `listings_province_id_fk`,
  DROP FOREIGN KEY `listings_city_id_fk`,
  DROP FOREIGN KEY `listings_suburb_id_fk`,
  DROP INDEX `idx_listings_location_id`,
  DROP INDEX `idx_listings_province_id`,
  DROP INDEX `idx_listings_city_id`,
  DROP INDEX `idx_listings_suburb_id`,
  DROP COLUMN `location_id`,
  DROP COLUMN `province_id`,
  DROP COLUMN `city_id`,
  DROP COLUMN `suburb_id`;
