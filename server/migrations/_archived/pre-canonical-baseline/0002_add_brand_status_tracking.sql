-- Migration: Add brand status and seeded tracking
-- Task 5.3: Add status, seeded_by_admin_user_id, seed_batch_id to developer_brand_profiles
-- Date: 2026-01-30

-- Add status enum column (default 'live' for existing rows)
ALTER TABLE developer_brand_profiles
ADD COLUMN status ENUM('seeded', 'live', 'archived') DEFAULT 'live' NOT NULL 
COMMENT 'Brand lifecycle status: seeded (super admin test data), live (active), archived (soft deleted)';

-- Add seeded tracking columns
ALTER TABLE developer_brand_profiles
ADD COLUMN seeded_by_admin_user_id INT NULL 
COMMENT 'Super admin who created this brand via emulator (null for real brands)';

ALTER TABLE developer_brand_profiles
ADD COLUMN seed_batch_id VARCHAR(36) NULL 
COMMENT 'Batch identifier for bulk seeded data cleanup';

-- Add FK constraint for seeded_by_admin_user_id
ALTER TABLE developer_brand_profiles
ADD CONSTRAINT fk_brand_seeded_by_admin
FOREIGN KEY (seeded_by_admin_user_id)
REFERENCES users(id)
ON DELETE SET NULL;

-- Add indexes for query performance
CREATE INDEX idx_brand_status ON developer_brand_profiles(status);
CREATE INDEX idx_brand_seeded_by ON developer_brand_profiles(seeded_by_admin_user_id);
CREATE INDEX idx_brand_seed_batch ON developer_brand_profiles(seed_batch_id);
