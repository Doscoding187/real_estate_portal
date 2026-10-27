-- Development geography is assigned by one admitted canonical Place identity.
-- Existing city/province/suburb values are not used to backfill identity.
ALTER TABLE `developments` ADD COLUMN `canonical_place_id` varchar(40) NULL;
