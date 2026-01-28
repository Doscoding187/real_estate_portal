-- ============================================
-- Migration: Add Missing Columns to unit_types
-- Production DB already has these - this is for documentation
-- Run: 2026-01-12
-- ============================================

ALTER TABLE unit_types
ADD COLUMN IF NOT EXISTS label VARCHAR(255),
ADD COLUMN IF NOT EXISTS ownership_type ENUM(
  'full-title',
  'sectional-title',
  'leasehold',
  'life-rights'
) DEFAULT 'sectional-title',
ADD COLUMN IF NOT EXISTS structural_type ENUM(
  'apartment',
  'freestanding-house',
  'simplex',
  'duplex',
  'penthouse',
  'plot-and-plan',
  'townhouse',
  'studio'
) DEFAULT 'apartment',
ADD COLUMN IF NOT EXISTS floors ENUM('single-storey','double-storey','triplex'),
ADD COLUMN IF NOT EXISTS size_from INT,
ADD COLUMN IF NOT EXISTS size_to INT,
ADD COLUMN IF NOT EXISTS price_from DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS price_to DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS deposit_required DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS completion_date DATE,
ADD COLUMN IF NOT EXISTS config_description TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS virtual_tour_link VARCHAR(500),
ADD COLUMN IF NOT EXISTS spec_overrides JSON,
ADD COLUMN IF NOT EXISTS specifications JSON,
ADD COLUMN IF NOT EXISTS amenities JSON,
ADD COLUMN IF NOT EXISTS features JSON,
ADD COLUMN IF NOT EXISTS parking_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS parking_bays INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS internal_notes TEXT;
