ALTER TABLE developments ADD COLUMN slug VARCHAR(255);
ALTER TABLE developments ADD COLUMN isPublished TINYINT DEFAULT 0 NOT NULL;
ALTER TABLE developments ADD COLUMN publishedAt TIMESTAMP NULL;
ALTER TABLE developments ADD COLUMN showHouseAddress TINYINT DEFAULT 1 NOT NULL;
ALTER TABLE developments ADD COLUMN floorPlans TEXT;
ALTER TABLE developments ADD COLUMN brochures TEXT;
CREATE UNIQUE INDEX idx_developments_slug ON developments(slug);
CREATE INDEX idx_developments_location ON developments(latitude, longitude);
