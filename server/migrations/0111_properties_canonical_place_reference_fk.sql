-- Geography Listing consumer expansion: one canonical Place assignment.
-- Provider identifiers remain evidence; no row or text backfill establishes identity.
-- Separate column, index and key statements preserve the TiDB expansion subset.
ALTER TABLE `properties` ADD CONSTRAINT `properties_canonical_place_id_place_place_id_fk` FOREIGN KEY (`canonical_place_id`) REFERENCES `place` (`place_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
