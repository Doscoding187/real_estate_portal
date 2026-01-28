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
