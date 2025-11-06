-- Update users table for custom authentication
USE propertifi_sa_database;

-- Add passwordHash column if it doesn't exist
ALTER TABLE users 
  ADD COLUMN passwordHash VARCHAR(255) AFTER email;

-- Add emailVerified column if it doesn't exist  
ALTER TABLE users
  ADD COLUMN emailVerified INT DEFAULT 0 NOT NULL AFTER loginMethod;

-- Make openId nullable (for email/password auth)
ALTER TABLE users
  MODIFY COLUMN openId VARCHAR(64) NULL;

-- Make email unique and nullable
ALTER TABLE users
  MODIFY COLUMN email VARCHAR(320) NULL UNIQUE;

SELECT 'Migration completed successfully!' as status;
