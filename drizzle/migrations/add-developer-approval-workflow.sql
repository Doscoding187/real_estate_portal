-- Add developer approval workflow columns to developers table
-- This migration adds the missing columns for the developer lead management feature

ALTER TABLE `developers` 
ADD COLUMN `userId` int NOT NULL AFTER `isVerified`,
ADD COLUMN `status` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL AFTER `userId`,
ADD COLUMN `rejectionReason` text NULL AFTER `status`,
ADD COLUMN `approvedBy` int NULL AFTER `rejectionReason`,
ADD COLUMN `approvedAt` timestamp NULL AFTER `approvedBy`,
ADD COLUMN `rejectedBy` int NULL AFTER `approvedAt`,
ADD COLUMN `rejectedAt` timestamp NULL AFTER `rejectedBy`;

-- Add foreign key constraints
ALTER TABLE `developers`
ADD CONSTRAINT `fk_developers_userId` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
ADD CONSTRAINT `fk_developers_approvedBy` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL,
ADD CONSTRAINT `fk_developers_rejectedBy` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX `idx_developers_userId` ON `developers`(`userId`);
CREATE INDEX `idx_developers_status` ON `developers`(`status`);
