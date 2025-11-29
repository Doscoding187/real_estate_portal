-- Add specializations column to developers table
ALTER TABLE developers 
ADD COLUMN specializations TEXT AFTER category;

-- Migrate existing category data to specializations as JSON array
UPDATE developers 
SET specializations = JSON_ARRAY(category)
WHERE specializations IS NULL;

-- Optional: Add comment to category column indicating it's deprecated
-- (Keep for backward compatibility but prefer specializations)
