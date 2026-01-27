-- Add missing columns to agent tables
-- These columns are required by the contract verifier

ALTER TABLE `agent_memory` 
  ADD COLUMN `role` enum('user','assistant','system') NOT NULL AFTER `conversation_id`,
  ADD COLUMN `content` text NOT NULL AFTER `role`;

ALTER TABLE `agent_tasks`
  ADD COLUMN `title` varchar(255) NOT NULL AFTER `id`;
