-- ============================================
-- Migration: Create development_phases table
-- Run this manually in TBD Cloud / Railway MySQL
-- ============================================

-- Check if table exists first (safe to skip if error)
-- If table already exists, this will fail gracefully

CREATE TABLE IF NOT EXISTS development_phases (
  id INT AUTO_INCREMENT NOT NULL,
  development_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  phase_number INT NOT NULL,
  description TEXT,
  status ENUM('planning','pre_launch','selling','sold_out','completed') DEFAULT 'planning' NOT NULL,
  total_units INT DEFAULT 0 NOT NULL,
  available_units INT DEFAULT 0 NOT NULL,
  price_from INT,
  price_to INT,
  launch_date TIMESTAMP NULL,
  completion_date TIMESTAMP NULL,
  spec_type ENUM('affordable','gap','luxury','custom') DEFAULT 'affordable',
  custom_spec_type VARCHAR(100),
  finishing_differences JSON,
  phase_highlights JSON,
  -- Latitude/Longitude added (ensure they exist)
  latitude VARCHAR(50),
  longitude VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT development_phases_development_id_fk FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_development_phases_development_id ON development_phases (development_id);
CREATE INDEX idx_development_phases_status ON development_phases (status);
CREATE INDEX idx_development_phases_spec_type ON development_phases (spec_type);

-- Verify table was created
-- SELECT 'development_phases table created successfully!' AS status;
