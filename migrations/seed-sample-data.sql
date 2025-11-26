-- =====================================================
-- SAMPLE DATA SEED SCRIPT
-- Run AFTER full-database-setup.sql completes
-- Creates realistic test data for development
-- =====================================================

USE real_estate_portal;

-- =====================================================
-- STEP 1: Sample Agencies
-- =====================================================

-- =====================================================
-- STEP 2: Sample Users (Agents & Visitors)
-- =====================================================

-- Agent users (passwords: agent123 - bcrypt hash shown)
-- Hash for 'agent123': $2a$10$XQ3KxwEqHVJ5g5mH4YX8Y.YZNcGHlE6HJ0YDK5g0/Q1nRX8B7qFqW

-- =====================================================
-- STEP 3: Sample Agent Profiles
-- =====================================================

-- =====================================================
-- STEP 4: Sample Properties
-- =====================================================

-- =====================================================
-- STEP 5: Sample Leads
-- =====================================================

-- =====================================================
-- STEP 6: Sample Prospects (Anonymous Users)
-- =====================================================

-- =====================================================
-- STEP 7: Sample Scheduled Viewings
-- =====================================================

-- =====================================================
-- STEP 8: Sample Prospect Favorites
-- =====================================================

-- =====================================================
-- STEP 9: Sample Recently Viewed
-- =====================================================

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT '✅ Sample data script completed - no data inserted for production!' AS status;

SELECT '
🎉 Sample Data Script Complete!
📊 No sample data was inserted - ready for production use
🔐 For testing, use your own login credentials
' AS summary;
