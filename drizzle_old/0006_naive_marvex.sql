ALTER TABLE `agents` ADD `status` enum('pending','approved','rejected','suspended') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `agents` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;