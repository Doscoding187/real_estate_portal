-- Migration: Add pending_agent_profiles table
-- This table stores agent profile data submitted during registration
-- Profile is created after email verification

CREATE TABLE IF NOT EXISTS pending_agent_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  displayName VARCHAR(200) NOT NULL,
  phoneNumber VARCHAR(50) NOT NULL,
  bio TEXT,
  licenseNumber VARCHAR(100),
  specializations TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_profile (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
