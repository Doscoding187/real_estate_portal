-- =====================================================
-- DATABASE BACKUP SCRIPT
-- Run this BEFORE executing full-database-setup.sql
-- =====================================================

-- Set backup directory and timestamp
SET @backup_time = DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s');
SET @backup_dir = 'C:/Users/Edward/Dropbox/PC/Desktop/real_estate_portal/backups/';

-- Show current database status
SELECT 'Current Database Status' AS info;
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'real_estate_portal'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;

-- =====================================================
-- MANUAL BACKUP INSTRUCTIONS
-- =====================================================

SELECT '
========================================
BACKUP INSTRUCTIONS
========================================

Option 1: MySQL Workbench (Easiest)
1. Click: Server → Data Export
2. Select: real_estate_portal schema
3. Check: "Dump Structure and Data"
4. Choose: Export to Self-Contained File
5. Set filename: real_estate_portal_backup_YYYYMMDD.sql
6. Click: Start Export

Option 2: Command Line
Run this command in PowerShell or CMD:

mysqldump -u app_user -p -h localhost -P 3307 real_estate_portal > backups/backup_YYYYMMDD_HHMMSS.sql

Option 3: Quick Table Count Check
Run this script to verify tables before migration

========================================
' AS backup_instructions;

-- Check if database exists and show table count
SELECT 
    SCHEMA_NAME,
    DEFAULT_CHARACTER_SET_NAME,
    DEFAULT_COLLATION_NAME
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = 'real_estate_portal';

SELECT COUNT(*) as existing_tables 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'real_estate_portal';

-- Show all existing tables
SELECT 'Existing Tables:' AS info;
SHOW TABLES FROM real_estate_portal;

-- =====================================================
-- VERIFY IMPORTANT DATA
-- =====================================================

-- Count records in key tables (if they exist)
SELECT 'Data Record Counts:' AS info;

SELECT 
    'users' as table_name, 
    COUNT(*) as record_count 
FROM real_estate_portal.users
UNION ALL
SELECT 
    'properties' as table_name, 
    COUNT(*) as record_count 
FROM real_estate_portal.properties
UNION ALL
SELECT 
    'agencies' as table_name, 
    COUNT(*) as record_count 
FROM real_estate_portal.agencies
UNION ALL
SELECT 
    'agents' as table_name, 
    COUNT(*) as record_count 
FROM real_estate_portal.agents;

-- =====================================================
-- BACKUP COMPLETE MESSAGE
-- =====================================================

SELECT '
✅ Backup verification complete!
📋 Review the table counts above
💾 Create backup using one of the methods shown
🚀 After backup, you can safely run full-database-setup.sql
' AS status;
