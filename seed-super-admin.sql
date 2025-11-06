-- Seed super_admin user
-- Run this AFTER executing add-role-based-auth.sql

USE propertifi_sa_database;

-- Insert super_admin user (password: Admin@123 - CHANGE THIS IN PRODUCTION!)
-- Password hash for "Admin@123" using bcrypt with cost 10
INSERT INTO users (email, passwordHash, firstName, lastName, role, emailVerified, createdAt, updatedAt, lastSignedIn)
VALUES (
  'admin@propertifi.co.za',
  '$2b$10$KtCKRJZ9jUiE.52W1VBQf.n6a5Q/y3.WVHiXy2qgPxYvLoZy3GC6a',
  'Super',
  'Admin',
  'super_admin',
  1,
  NOW(),
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE role = 'super_admin';

SELECT 'Super admin user created! Email: admin@propertifi.co.za' AS status;
SELECT 'IMPORTANT: Update the passwordHash with actual bcrypt hash of your chosen password!' AS warning;
