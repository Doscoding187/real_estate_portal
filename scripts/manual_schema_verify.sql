-- MANUAL SCHEMA VERIFICATION SCRIPT
-- Run this in your TiDB Client (e.g. DBeaver, MySQL Workbench, CLI)

USE listify_property_sa;

-- 1. Check if the 'developments' table has the new columns
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM 
    information_schema.COLUMNS 
WHERE 
    TABLE_SCHEMA = 'listify_property_sa' 
    AND TABLE_NAME = 'developments'
    AND COLUMN_NAME IN ('nature', 'total_development_area', 'property_types', 'custom_classification', 'status');

-- Expected Output:
-- nature                  enum('new','phase','extension','redevelopment')
-- total_development_area  int(11) / int
-- property_types          json
-- custom_classification   varchar(255)
-- status                  enum('launching-soon','selling','sold-out')

-- 2. Detail View of the Status Column (to verify exact Enum values)
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE 
FROM 
    information_schema.COLUMNS 
WHERE 
    TABLE_SCHEMA = 'listify_property_sa' 
    AND TABLE_NAME = 'developments' 
    AND COLUMN_NAME = 'status';

-- 3. Quick Data Check (See if any rows exist with new data - likely empty if just migrated)
SELECT id, name, nature, status, property_types FROM developments LIMIT 5;
