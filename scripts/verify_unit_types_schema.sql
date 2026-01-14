-- VERIFY UNIT TYPES SCHEMA
-- Run this in your TiDB client to confirm the table structure matches the code expectations.

USE listify_property_sa;

-- 1. Check Columns
SHOW COLUMNS FROM unit_types;

-- 2. Verify JSON Fields existence
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE 
FROM 
    information_schema.COLUMNS 
WHERE 
    TABLE_SCHEMA = 'listify_property_sa' 
    AND TABLE_NAME = 'unit_types' 
    AND COLUMN_NAME IN ('specifications', 'amenities', 'base_media', 'extras', 'features');

-- 3. Check for any data (if verified against a specific dev ID)
-- SELECT * FROM unit_types LIMIT 5;
