CREATE TABLE `development_approval_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`submitted_by` int NOT NULL,
	`status` enum('pending','reviewing','approved','rejected') NOT NULL DEFAULT 'pending',
	`submission_type` enum('initial','update') NOT NULL DEFAULT 'initial',
	`review_notes` text,
	`rejection_reason` text,
	`compliance_checks` json,
	`submitted_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`reviewed_at` timestamp,
	`reviewed_by` int
);
--> statement-breakpoint
ALTER TABLE `developments` ADD `approval_status` enum('draft','pending','approved','rejected') DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_dev_approval_status` ON `development_approval_queue` (`status`);--> statement-breakpoint
CREATE INDEX `idx_dev_approval_dev_id` ON `development_approval_queue` (`development_id`);