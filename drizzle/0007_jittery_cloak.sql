ALTER TABLE `developers` ADD `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `developers` ADD `status` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `developers` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `developers` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `developers` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `developers` ADD `rejectedBy` int;--> statement-breakpoint
ALTER TABLE `developers` ADD `rejectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `developers` ADD CONSTRAINT `developers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developers` ADD CONSTRAINT `developers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developers` ADD CONSTRAINT `developers_rejectedBy_users_id_fk` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;