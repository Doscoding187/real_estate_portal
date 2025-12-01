-- Add indexes for price insights queries
-- These indexes optimize the queries used by the price insights service

-- Index on cityId for faster city-based aggregations
CREATE INDEX IF NOT EXISTS idx_properties_cityId ON properties(cityId);

-- Index on suburbId for micromarket queries
CREATE INDEX IF NOT EXISTS idx_properties_suburbId ON properties(suburbId);

-- Composite index on cityId and status for filtered city queries
CREATE INDEX IF NOT EXISTS idx_properties_cityId_status ON properties(cityId, status);

-- Composite index on cityId and area for price per m² calculations
CREATE INDEX IF NOT EXISTS idx_properties_cityId_area ON properties(cityId, area);
