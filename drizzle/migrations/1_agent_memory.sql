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
