-- Seed super_admin user
-- Run this AFTER executing add-role-based-auth.sql

USE propertifi_sa_database;

-- NOTE: Default super admin user has been removed for production deployment
-- The script has been modified to prevent creation of a default admin user
-- Super admin users should be created manually with strong passwords in production

-- The original INSERT statement has been commented out:
-- Insert super_admin user (password: Admin@123 - CHANGE THIS IN PRODUCTION!)
-- Password hash for "Admin@123" using bcrypt with cost 10
-- INSERT INTO users (email, passwordHash, firstName, lastName, role, emailVerified, createdAt, updatedAt, lastSignedIn)
-- VALUES (
--   'admin@propertifi.co.za',
--   '$2b$10$KtCKRJZ9jUiE.52W1VBQf.n6a5Q/y3.WVHiXy2qgPxYvLoZy3GC6a',
--   'Super',
--   'Admin',
--   'super_admin',
--   1,
--   NOW(),
--   NOW(),
--   NOW()
-- )
-- ON DUPLICATE KEY UPDATE role = 'super_admin';

SELECT '⚠️ Super admin user script completed - no default admin user created for production!' AS status;
SELECT '🔐 For security, super admin users must be created manually with strong passwords!' AS warning;