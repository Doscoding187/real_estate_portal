-- Add missing columns to agents table
-- This fixes the login 500 error for agent users

ALTER TABLE agents 
ADD COLUMN status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending' NOT NULL AFTER isFeatured;

ALTER TABLE agents 
ADD COLUMN rejectionReason TEXT AFTER status;

ALTER TABLE agents 
ADD COLUMN approvedBy INT AFTER rejectionReason;

ALTER TABLE agents 
ADD COLUMN approvedAt TIMESTAMP NULL AFTER approvedBy;

-- Add foreign key constraint for approvedBy
ALTER TABLE agents 
ADD CONSTRAINT fk_agents_approvedBy 
FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL;
