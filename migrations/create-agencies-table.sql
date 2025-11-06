-- Create agencies table
CREATE TABLE IF NOT EXISTS `agencies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT,
  `logo` TEXT,
  `website` VARCHAR(255),
  `email` VARCHAR(320),
  `phone` VARCHAR(50),
  `address` TEXT,
  `city` VARCHAR(100),
  `province` VARCHAR(100),
  `subscriptionPlan` VARCHAR(50) NOT NULL DEFAULT 'free',
  `subscriptionStatus` VARCHAR(30) NOT NULL DEFAULT 'trial',
  `subscriptionExpiry` TIMESTAMP NULL,
  `isVerified` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add index on slug for faster lookups
CREATE INDEX idx_agencies_slug ON `agencies` (`slug`);

-- Add index on city and province for filtering
CREATE INDEX idx_agencies_location ON `agencies` (`city`, `province`);

-- Add index on subscription plan
CREATE INDEX idx_agencies_subscription ON `agencies` (`subscriptionPlan`, `subscriptionStatus`);

SELECT 'Agencies table created successfully!' AS message;
