-- Migration: Add missing ownership columns
-- Task 5.2: Add brand_profile_id to listings + FK constraint on leads
-- Date: 2026-01-30

-- Step 1: Add brand_profile_id to listings table (nullable for existing rows)
ALTER TABLE listings 
ADD COLUMN brand_profile_id INT NULL COMMENT 'Brand that seeded this listing (null for real agent/owner listings)',
ADD INDEX idx_listings_brand_profile_id (brand_profile_id);

-- Step 2: Add FK constraint to leads.developer_brand_profile_id
-- This column already exists but has no FK constraint
ALTER TABLE leads
ADD CONSTRAINT fk_leads_brand_profile 
FOREIGN KEY (developer_brand_profile_id) 
REFERENCES developer_brand_profiles(id) 
ON DELETE SET NULL;

-- Step 3: Add index on leads.developer_brand_profile_id for query performance
CREATE INDEX idx_leads_brand_profile_id ON leads(developer_brand_profile_id);
