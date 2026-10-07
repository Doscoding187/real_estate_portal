-- Geography Listing consumer expansion: one canonical Place assignment.
-- Provider identifiers remain evidence; no row or text backfill establishes identity.
-- Separate column, index and key statements preserve the TiDB expansion subset.
CREATE INDEX `idx_listings_canonical_place_id` ON `listings` (`canonical_place_id`);
