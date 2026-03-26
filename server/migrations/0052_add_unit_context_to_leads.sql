ALTER TABLE leads
  ADD COLUMN unit_id VARCHAR(36) NULL AFTER message;

ALTER TABLE leads
  ADD COLUMN unit_name VARCHAR(255) NULL AFTER unit_id;

ALTER TABLE leads
  ADD COLUMN unit_price_from DECIMAL(15,2) NULL AFTER unit_name;

ALTER TABLE leads
  ADD COLUMN unit_bedrooms INT NULL AFTER unit_price_from;

ALTER TABLE leads
  ADD COLUMN unit_bathrooms DECIMAL(3,1) NULL AFTER unit_bedrooms;

CREATE INDEX idx_leads_unit_id ON leads (unit_id);
