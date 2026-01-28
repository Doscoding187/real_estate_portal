-- Migration: Add Development Wizard Optimization Fields
-- Date: 2024-12-05
-- Description: Adds new fields required for the optimized 5-step development wizard

-- Add new location fields
ALTER TABLE developments 
ADD COLUMN suburb VARCHAR(100) AFTER province,
ADD COLUMN postal_code VARCHAR(20) AFTER suburb,
ADD COLUMN gps_accuracy ENUM('accurate', 'approximate') DEFAULT 'approximate' AFTER longitude;

-- Add rating field (auto-calculated)
ALTER TABLE developments 
ADD COLUMN rating DECIMAL(3,2) AFTER description;

-- Convert amenities from TEXT to JSON and add new JSON fields
ALTER TABLE developments 
MODIFY COLUMN amenities JSON COMMENT 'Development amenities (Swimming Pool, Clubhouse, etc.)',
ADD COLUMN highlights JSON COMMENT 'Up to 5 development highlights' AFTER amenities,
ADD COLUMN features JSON COMMENT 'Estate-level features (Perimeter Wall, Fibre Ready, etc.)' AFTER highlights;

-- Update status enum to include new values
ALTER TABLE developments 
MODIFY COLUMN status ENUM(
  'now-selling',
  'launching-soon', 
  'under-construction',
  'ready-to-move',
  'sold-out',
  'phase-completed',
  'new-phase-launching',
  'planning',
  'completed',
  'coming_soon'
) DEFAULT 'planning' NOT NULL;

-- Add indexes for new fields
CREATE INDEX idx_developments_gps_accuracy ON developments(gps_accuracy);
CREATE INDEX idx_developments_suburb ON developments(suburb);
CREATE INDEX idx_developments_rating ON developments(rating);

-- Add comment to table
ALTER TABLE developments COMMENT = 'Main developments table with wizard optimization fields';
