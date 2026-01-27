-- Create activities table for tracking all developer activities
-- Validates: Requirements 5.1, 5.2, 5.3

CREATE TABLE IF NOT EXISTS `activities` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `developer_id` int NOT NULL,
  `activity_type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `metadata` json COMMENT 'Flexible data storage for activity-specific information',
  `related_entity_type` enum('development', 'unit', 'lead', 'campaign', 'team_member'),
  `related_entity_id` int,
  `user_id` int COMMENT 'User who triggered the activity',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX `idx_activities_developer_id` ON `activities`(`developer_id`);
CREATE INDEX `idx_activities_activity_type` ON `activities`(`activity_type`);
CREATE INDEX `idx_activities_created_at` ON `activities`(`created_at`);
CREATE INDEX `idx_activities_related_entity` ON `activities`(`related_entity_type`, `related_entity_id`);
