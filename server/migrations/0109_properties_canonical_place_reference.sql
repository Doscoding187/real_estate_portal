-- Geography Listing consumer expansion: one canonical Place assignment.
-- Provider identifiers remain evidence; no row or text backfill establishes identity.
-- Separate column, index and key statements preserve the TiDB expansion subset.
ALTER TABLE `properties` ADD COLUMN `canonical_place_id` varchar(40) NULL;
