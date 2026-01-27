-- Manual Migration for Agent Tables
-- Run each CREATE TABLE statement separately in your TiDB SQL tool

-- Agent Memory Table
CREATE TABLE IF NOT EXISTS `agent_memory` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`session_id` VARCHAR(100) NOT NULL,
	`conversation_id` VARCHAR(100),
	`user_id` INT,
	`user_input` TEXT NOT NULL,
	`agent_response` TEXT NOT NULL,
	`metadata` JSON,
	`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	INDEX `idx_agent_memory_session` (`session_id`),
	INDEX `idx_agent_memory_conversation` (`conversation_id`),
	INDEX `idx_agent_memory_user` (`user_id`),
	INDEX `idx_agent_memory_created` (`created_at`)
);

-- Agent Tasks Table
CREATE TABLE IF NOT EXISTS `agent_tasks` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`task_id` VARCHAR(100) NOT NULL UNIQUE,
	`session_id` VARCHAR(100),
	`user_id` INT,
	`task_type` VARCHAR(50) NOT NULL,
	`status` ENUM('pending', 'running', 'completed', 'failed') NOT NULL DEFAULT 'pending',
	`priority` INT NOT NULL DEFAULT 0,
	`input_data` JSON,
	`output_data` JSON,
	`error_message` TEXT,
	`started_at` TIMESTAMP,
	`completed_at` TIMESTAMP,
	`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	INDEX `idx_agent_tasks_status` (`status`),
	INDEX `idx_agent_tasks_type` (`task_type`),
	INDEX `idx_agent_tasks_user` (`user_id`),
	INDEX `idx_agent_tasks_session` (`session_id`),
	INDEX `idx_agent_tasks_created` (`created_at`)
);

-- Agent Knowledge Table
CREATE TABLE IF NOT EXISTS `agent_knowledge` (
	`id` INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
	`topic` VARCHAR(200) NOT NULL,
	`content` TEXT NOT NULL,
	`category` VARCHAR(100),
	`tags` JSON,
	`metadata` JSON,
	`is_active` INT NOT NULL DEFAULT 1,
	`created_by` INT,
	`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	INDEX `idx_agent_knowledge_topic` (`topic`),
	INDEX `idx_agent_knowledge_category` (`category`),
	INDEX `idx_agent_knowledge_active` (`is_active`),
	INDEX `idx_agent_knowledge_created` (`created_at`)
);

-- Verify tables were created
SELECT 'agent_memory' as table_name, COUNT(*) as row_count FROM agent_memory
UNION ALL
SELECT 'agent_tasks', COUNT(*) FROM agent_tasks
UNION ALL
SELECT 'agent_knowledge', COUNT(*) FROM agent_knowledge;