-- ============================================
-- MIGRATION: Development Wizard V2 Fields
-- Date: 2024-12-05
-- Description: Adds new fields required for the 6-step wizard V2
-- ============================================

-- Add new fields to developments table
ALTER TABLE developments 
ADD COLUMN IF NOT EXISTS property_type ENUM('residential', 'commercial', 'land') NOT NULL DEFAULT 'residential' 
  COMMENT 'Property category for conditional field display' 
  AFTER development_type;

ALTER TABLE developments 
ADD COLUMN IF NOT EXISTS parent_development_id INT NULL 
  COMMENT 'For phases - references parent development' 
  AFTER developer_id;

ALTER TABLE developments 
ADD COLUMN IF NOT EXISTS ownership_type ENUM('freehold', 'sectional_title', 'leasehold') DEFAULT 'freehold' 
  COMMENT 'Type of property ownership' 
  AFTER property_type;

ALTER TABLE developments 
ADD COLUMN IF NOT EXISTS copy_parent_details BOOLEAN DEFAULT FALSE 
  COMMENT 'Whether to inherit parent development data' 
  AFTER parent_development_id;

-- Add foreign key for parent development (phases)
ALTER TABLE developments 
ADD CONSTRAINT fk_developments_parent 
  FOREIGN KEY (parent_development_id) 
  REFERENCES developments(id) 
  ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_developments_parent ON developments(parent_development_id);
CREATE INDEX IF NOT EXISTS idx_developments_property_type ON developments(property_type);
CREATE INDEX IF NOT EXISTS idx_developments_ownership_type ON developments(ownership_type);

-- Update development_drafts table for autosave
ALTER TABLE development_drafts
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT TRUE 
  COMMENT 'Draft status flag';

ALTER TABLE development_drafts
ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
  COMMENT 'Last autosave timestamp';

-- Add index for draft queries
CREATE INDEX IF NOT EXISTS idx_dev_drafts_is_draft ON development_drafts(is_draft, last_saved_at);

-- ============================================
-- Update unit_types specifications structure
-- Note: JSON columns are already flexible, but we're documenting the new structure
-- ============================================

-- Add comment to document new structured specifications format
ALTER TABLE unit_types 
MODIFY COLUMN base_features JSON 
COMMENT 'Structured: {bathroom: {...}, kitchen: {...}, interior: {...}, exterior: {...}}';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- New fields added:
-- - developments.property_type (residential/commercial/land)
-- - developments.parent_development_id (for phases)
-- - developments.ownership_type (freehold/sectional_title/leasehold)
-- - developments.copy_parent_details (inheritance toggle)
-- - development_drafts.is_draft (draft status)
-- - development_drafts.last_saved_at (autosave timestamp)
--
-- Indexes created:
-- - idx_developments_parent
-- - idx_developments_property_type
-- - idx_developments_ownership_type
-- - idx_dev_drafts_is_draft
--
-- Foreign keys:
-- - fk_developments_parent (parent_development_id → developments.id)
-- ============================================
