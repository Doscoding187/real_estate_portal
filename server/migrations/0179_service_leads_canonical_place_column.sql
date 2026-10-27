ALTER TABLE `service_leads`
  DROP COLUMN `geo_province`,
  DROP COLUMN `geo_city`,
  DROP COLUMN `geo_suburb`,
  ADD COLUMN `canonical_place_id` varchar(40) NULL;
