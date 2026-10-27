-- Service coverage and requests carry one admitted canonical Place identity.
-- Existing free-text geography is not authoritative and is not backfilled.
ALTER TABLE `service_provider_locations`
  DROP INDEX `idx_service_provider_locations_geo`,
  DROP COLUMN `country_code`,
  DROP COLUMN `province`,
  DROP COLUMN `city`,
  DROP COLUMN `suburb`,
  DROP COLUMN `postal_code`,
  DROP COLUMN `latitude`,
  DROP COLUMN `longitude`,
  DROP COLUMN `radius_km`,
  ADD COLUMN `canonical_place_id` varchar(40) NULL AFTER `provider_id`;
