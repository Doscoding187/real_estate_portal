-- Add developer approval workflow columns
ALTER TABLE `developers` 
ADD COLUMN IF NOT EXISTS `userId` int NOT NULL,
ADD COLUMN IF NOT EXISTS `status` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL,
ADD COLUMN IF NOT EXISTS `rejectionReason` text NULL,
ADD COLUMN IF NOT EXISTS `approvedBy` int NULL,
ADD COLUMN IF NOT EXISTS `approvedAt` timestamp NULL,
ADD COLUMN IF NOT EXISTS `rejectedBy` int NULL,
ADD COLUMN IF NOT EXISTS `rejectedAt` timestamp NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS `idx_developers_userId` ON `developers`(`userId`);
CREATE INDEX IF NOT EXISTS `idx_developers_status` ON `developers`(`status`);
