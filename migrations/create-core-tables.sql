-- Create Core Tables for Agent Dashboard
-- This migration creates agents, developers, developments, and related tables

-- Step 1: Create developers table (needed for developments)
CREATE TABLE IF NOT EXISTS developers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo TEXT,
  website VARCHAR(255),
  email VARCHAR(320),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  category ENUM('residential', 'commercial', 'mixed_use', 'industrial') DEFAULT 'residential' NOT NULL,
  establishedYear INT,
  totalProjects INT DEFAULT 0,
  rating INT DEFAULT 0,
  reviewCount INT DEFAULT 0,
  isVerified TINYINT(1) DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_verified (isVerified),
  INDEX idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  agencyId INT,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  displayName VARCHAR(200),
  bio TEXT,
  profileImage TEXT,
  phone VARCHAR(50),
  email VARCHAR(320),
  whatsapp VARCHAR(50),
  specialization TEXT COMMENT 'JSON array',
  role ENUM('agent', 'principal_agent', 'broker') DEFAULT 'agent' NOT NULL,
  licenseNumber VARCHAR(100),
  yearsExperience INT,
  areasServed TEXT COMMENT 'JSON array of cities/areas',
  languages TEXT COMMENT 'JSON array',
  rating INT DEFAULT 0,
  reviewCount INT DEFAULT 0,
  totalSales INT DEFAULT 0,
  isVerified TINYINT(1) DEFAULT 0 NOT NULL,
  isFeatured TINYINT(1) DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE SET NULL,
  INDEX idx_user (userId),
  INDEX idx_agency (agencyId),
  INDEX idx_verified (isVerified),
  INDEX idx_featured (isFeatured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Create developments table
CREATE TABLE IF NOT EXISTS developments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  developerId INT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  developmentType ENUM('residential', 'commercial', 'mixed_use', 'estate', 'complex') NOT NULL,
  status ENUM('planning', 'under_construction', 'completed', 'coming_soon') DEFAULT 'planning' NOT NULL,
  address TEXT,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  latitude VARCHAR(50),
  longitude VARCHAR(50),
  totalUnits INT,
  availableUnits INT,
  priceFrom INT,
  priceTo INT,
  amenities TEXT COMMENT 'JSON array',
  images TEXT COMMENT 'JSON array of image URLs',
  videos TEXT COMMENT 'JSON array of video URLs',
  completionDate TIMESTAMP NULL,
  isFeatured TINYINT(1) DEFAULT 0 NOT NULL,
  views INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (developerId) REFERENCES developers(id) ON DELETE CASCADE,
  INDEX idx_developer (developerId),
  INDEX idx_status (status),
  INDEX idx_featured (isFeatured),
  INDEX idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Create services table
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category ENUM('home_loan', 'insurance', 'interior_design', 'legal', 'moving', 'other') NOT NULL,
  description TEXT,
  logo TEXT,
  website VARCHAR(255),
  email VARCHAR(320),
  phone VARCHAR(50),
  commissionRate INT COMMENT 'percentage * 100 (e.g., 250 = 2.5%)',
  isActive TINYINT(1) DEFAULT 1 NOT NULL,
  isFeatured TINYINT(1) DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_category (category),
  INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 5: Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  reviewType ENUM('agent', 'developer', 'property') NOT NULL,
  targetId INT NOT NULL,
  rating INT NOT NULL,
  title VARCHAR(255),
  comment TEXT,
  isVerified TINYINT(1) DEFAULT 0 NOT NULL,
  isPublished TINYINT(1) DEFAULT 1 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_review_type (reviewType, targetId),
  INDEX idx_published (isPublished)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 6: Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  type ENUM('province', 'city', 'suburb', 'neighborhood') NOT NULL,
  parentId INT,
  description TEXT,
  latitude VARCHAR(50),
  longitude VARCHAR(50),
  propertyCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_type (type),
  INDEX idx_parent (parentId),
  INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 7: Create explore_videos table
CREATE TABLE IF NOT EXISTS exploreVideos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agentId INT,
  propertyId INT,
  developmentId INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  videoUrl TEXT NOT NULL,
  thumbnailUrl TEXT,
  duration INT COMMENT 'in seconds',
  views INT DEFAULT 0 NOT NULL,
  likes INT DEFAULT 0 NOT NULL,
  shares INT DEFAULT 0 NOT NULL,
  isPublished TINYINT(1) DEFAULT 1 NOT NULL,
  isFeatured TINYINT(1) DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE SET NULL,
  FOREIGN KEY (developmentId) REFERENCES developments(id) ON DELETE SET NULL,
  INDEX idx_agent (agentId),
  INDEX idx_published (isPublished),
  INDEX idx_featured (isFeatured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 8: Update properties table to add agent and development references (if columns don't exist)
ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS agentId INT AFTER views,
  ADD COLUMN IF NOT EXISTS developmentId INT AFTER agentId;

-- Add foreign keys if they don't exist
-- Note: MySQL doesn't support IF NOT EXISTS for foreign keys, so we'll use a stored procedure approach
SET @constraint_check = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties' 
  AND CONSTRAINT_NAME = 'fk_properties_agent'
);

SET @sql = IF(@constraint_check = 0,
  'ALTER TABLE properties ADD CONSTRAINT fk_properties_agent FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL',
  'SELECT "Foreign key fk_properties_agent already exists" AS status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_check = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'properties' 
  AND CONSTRAINT_NAME = 'fk_properties_development'
);

SET @sql = IF(@constraint_check = 0,
  'ALTER TABLE properties ADD CONSTRAINT fk_properties_development FOREIGN KEY (developmentId) REFERENCES developments(id) ON DELETE SET NULL',
  'SELECT "Foreign key fk_properties_development already exists" AS status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Core tables created successfully!' AS status;
