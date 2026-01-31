-- Migration: Configure cascade behavior for brand deletion
-- Task 5.5: Safe cascade strategy for seeded content cleanup
-- Date: 2026-01-30

-- Update developments FK to CASCADE on brand deletion
-- This ensures seeded developments are deleted when brand is deleted
ALTER TABLE developments
DROP FOREIGN KEY dev_brand_fk,
ADD CONSTRAINT dev_brand_fk
  FOREIGN KEY (developer_brand_profile_id)
  REFERENCES developer_brand_profiles(id)
  ON DELETE CASCADE;

-- Update marketing brand FK to CASCADE as well
ALTER TABLE developments
DROP FOREIGN KEY mkt_brand_fk,
ADD CONSTRAINT mkt_brand_fk
  FOREIGN KEY (marketing_brand_profile_id)
  REFERENCES developer_brand_profiles(id)
  ON DELETE CASCADE;

-- Add FK constraint to listings.brand_profile_id with CASCADE
-- Seeded listings should be deleted with the brand
ALTER TABLE listings
ADD CONSTRAINT fk_listings_brand_profile
  FOREIGN KEY (brand_profile_id)
  REFERENCES developer_brand_profiles(id)
  ON DELETE CASCADE;

-- Note: leads.developer_brand_profile_id uses SET NULL (already configured in 0001)
-- This preserves lead history even if brand is deleted
