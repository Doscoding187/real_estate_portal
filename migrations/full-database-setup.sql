-- =====================================================
-- COMPLETE DATABASE SETUP FOR SA PROPERTY PORTAL
-- Run this script to set up the entire database from scratch
-- =====================================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS real_estate_portal;
USE real_estate_portal;

-- =====================================================
-- STEP 1: BASE SCHEMA (Users, Properties, Core Tables)
-- =====================================================

SOURCE create-base-schema.sql;

-- =====================================================
-- STEP 2: CORE TABLES (Agents, Agencies, Services)
-- =====================================================

SOURCE create-core-tables.sql;

-- =====================================================
-- STEP 3: AGENCIES & SUBSCRIPTIONS
-- =====================================================

SOURCE create-agencies-table.sql;

-- =====================================================
-- STEP 4: INVITATIONS & ONBOARDING
-- =====================================================

SOURCE create-invitations-table.sql;

-- =====================================================
-- STEP 5: AGENT DASHBOARD & ANALYTICS
-- =====================================================

SOURCE create-agent-dashboard-tables.sql;

-- =====================================================
-- STEP 6: PROSPECT PRE-QUALIFICATION SYSTEM
-- =====================================================

SOURCE create-prospect-tables.sql;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

SELECT '🎉 SA Property Portal Database Setup Complete!' AS status;
SELECT '📊 All tables created successfully' AS message;
SELECT '🏆 Ready for Phase 4: Gamified Prospect Dashboard' AS next_step;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count all tables (should be 21+ tables)
SELECT COUNT(*) as total_tables FROM information_schema.tables
WHERE table_schema = 'real_estate_portal';

-- Show all tables
SHOW TABLES;

-- Check prospect tables specifically
SELECT 'Prospect tables created:' AS status;
SHOW TABLES LIKE 'prospect%';
SHOW TABLES LIKE 'scheduled_viewings';
SHOW TABLES LIKE 'recently_viewed';

-- =====================================================
-- SAMPLE DATA INSERTION (Optional)
-- =====================================================

-- You can run these separately if you want sample data:
-- SOURCE seed-super-admin.sql
-- SOURCE seed-sa-locations.ts
-- SOURCE seed-plans.ts