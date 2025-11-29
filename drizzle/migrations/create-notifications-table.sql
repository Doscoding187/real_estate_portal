-- Add developer_notifications table for developer notifications
-- This supports the mission control notification system
CREATE TABLE `developer_notifications` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `developer_id` int NOT NULL,
  `user_id` int NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `type` varchar(50) NOT NULL,
  `severity` enum('info', 'warning', 'error', 'success') NOT NULL DEFAULT 'info',
  `read` boolean NOT NULL DEFAULT false,
  `action_url` varchar(500) NULL,
  `metadata` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Foreign key constraints
  CONSTRAINT `fk_notifications_developer_id` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX `idx_developer_notifications_developer_id` ON `developer_notifications`(`developer_id`);
CREATE INDEX `idx_developer_notifications_user_id` ON `developer_notifications`(`user_id`);
CREATE INDEX `idx_developer_notifications_read` ON `developer_notifications`(`read`);
CREATE INDEX `idx_developer_notifications_created_at` ON `developer_notifications`(`created_at`);
CREATE INDEX `idx_developer_notifications_type` ON `developer_notifications`(`type`);

-- Composite index for notification feed queries (unread first, then by date)
CREATE INDEX `idx_developer_notifications_feed` ON `developer_notifications`(`developer_id`, `read`, `created_at` DESC);
