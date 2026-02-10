-- Seed Cleanup Sanity Test SQL Script
-- Run this in MySQL CLI

-- Phase 1: Create seed brand profile
-- Check if exists first
SELECT id, brand_name, slug, owner_type, seed_batch_id 
FROM developer_brand_profiles 
WHERE slug = 'seed-test-brand-2026-02-04';

-- If not exists, insert:
-- INSERT INTO developer_brand_profiles 
-- (brand_name, slug, owner_type, seed_batch_id, is_visible, is_claimable, created_at) 
-- VALUES 
-- ('Seed Test Brand 2026-02-04', 'seed-test-brand-2026-02-04', 'platform', 'seed_sanity_2026_02_04', 1, 1, NOW());

-- Get the brandProfileId (replace with actual ID from previous query)
-- SET @brandProfileId = <ID>;

-- Phase 2: Create dependencies
-- Create development (adjust required columns based on your schema)
-- INSERT INTO developments 
-- (name, developer_brand_profile_id, status, created_at) 
-- VALUES 
-- ('Test Development 2026-02-04', @brandProfileId, 'active', NOW());

-- SET @developmentId = LAST_INSERT_ID();

-- Create unit type
-- INSERT INTO unit_types 
-- (name, development_id, created_at) 
-- VALUES 
-- ('Test Unit Type', @developmentId, NOW());

-- Create lead  
-- INSERT INTO leads 
-- (name, email, developer_brand_profile_id, developmentId, leadType, status, createdAt, updatedAt) 
-- VALUES 
-- ('Test Lead', 'test@example.com', @brandProfileId, @developmentId, 'inquiry', 'new', NOW(), NOW());

-- Phase 4: Verification queries (run AFTER triggering cleanup)
-- 1. Check brand profile
-- SELECT id, brand_name, slug, is_visible, owner_type, seed_batch_id
-- FROM developer_brand_profiles
-- WHERE id = @brandProfileId;

-- 2. Check developments deleted
-- SELECT COUNT(*) AS dev_count
-- FROM developments
-- WHERE developer_brand_profile_id = @brandProfileId;

-- 3. Check unit types deleted
-- SELECT COUNT(*) AS unit_count
-- FROM unit_types
-- WHERE development_id = @developmentId;

-- 4. Check leads deleted
-- SELECT COUNT(*) AS lead_count
-- FROM leads
-- WHERE developer_brand_profile_id = @brandProfileId;
