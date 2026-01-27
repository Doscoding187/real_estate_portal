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
