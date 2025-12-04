-- Add fields for development phase optimization
-- These fields support spec types, finishing differences, and phase-specific details

-- Add spec type field
ALTER TABLE development_phases ADD COLUMN spec_type ENUM('affordable', 'gap', 'luxury', 'custom') DEFAULT 'affordable';

-- Add custom spec type for when spec_type is 'custom'
ALTER TABLE development_phases ADD COLUMN custom_spec_type VARCHAR(100);

-- Add finishing differences as JSON
ALTER TABLE development_phases ADD COLUMN finishing_differences JSON;

-- Add phase highlights as JSON array
ALTER TABLE development_phases ADD COLUMN phase_highlights JSON;

-- Add optional location override
ALTER TABLE development_phases ADD COLUMN latitude VARCHAR(50);
ALTER TABLE development_phases ADD COLUMN longitude VARCHAR(50);

-- Add index on spec_type for filtering
CREATE INDEX idx_development_phases_spec_type ON development_phases(spec_type);
