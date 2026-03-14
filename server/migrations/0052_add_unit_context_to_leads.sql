ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS unit_id VARCHAR(36) NULL AFTER message,
  ADD COLUMN IF NOT EXISTS unit_name VARCHAR(255) NULL AFTER unit_id,
  ADD COLUMN IF NOT EXISTS unit_price_from DECIMAL(15,2) NULL AFTER unit_name,
  ADD COLUMN IF NOT EXISTS unit_bedrooms INT NULL AFTER unit_price_from,
  ADD COLUMN IF NOT EXISTS unit_bathrooms DECIMAL(3,1) NULL AFTER unit_bedrooms;

CREATE INDEX IF NOT EXISTS idx_leads_unit_id ON leads (unit_id);
