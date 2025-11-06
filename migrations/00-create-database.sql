-- =====================================================
-- STEP 0: Create Database
-- Run this FIRST before any other migrations
-- =====================================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS real_estate_portal
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE real_estate_portal;

-- Verify database was created
SELECT 'Database created successfully!' AS status;
SELECT DATABASE() AS current_database;
