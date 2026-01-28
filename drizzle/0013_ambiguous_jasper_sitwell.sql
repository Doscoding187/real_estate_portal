CREATE TABLE `platform_inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`userType` enum('agent','developer','seller','partner','other') NOT NULL,
	`intent` enum('advertise','software','partnership','support') NOT NULL DEFAULT 'advertise',
	`message` text,
	`status` enum('new','contacted','converted','closed') NOT NULL DEFAULT 'new',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `developments` ADD `ownership_type` enum('full-title','sectional-title','leasehold','life-rights');--> statement-breakpoint
ALTER TABLE `developments` ADD `structural_type` enum('apartment','freestanding-house','simplex','duplex','penthouse','plot-and-plan','townhouse','studio');--> statement-breakpoint
ALTER TABLE `developments` ADD `floors` enum('single-storey','double-storey','triplex');