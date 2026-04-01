CREATE TABLE `google_places_api_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`request_type` enum('autocomplete','place_details','geocode','reverse_geocode') NOT NULL,
	`session_token` varchar(255),
	`success` tinyint NOT NULL DEFAULT 1,
	`response_time_ms` int NOT NULL,
	`error_message` text,
	`user_id` int,
	`ip_address` varchar(45),
	CONSTRAINT `google_places_api_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE INDEX `idx_gpal_timestamp` ON `google_places_api_logs` (`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_gpal_request_type` ON `google_places_api_logs` (`request_type`);
--> statement-breakpoint
CREATE INDEX `idx_gpal_success` ON `google_places_api_logs` (`success`);
--> statement-breakpoint
CREATE INDEX `idx_gpal_session_token` ON `google_places_api_logs` (`session_token`);
--> statement-breakpoint
CREATE INDEX `idx_gpal_user_id` ON `google_places_api_logs` (`user_id`);
--> statement-breakpoint

CREATE TABLE `google_places_api_daily_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`total_requests` int NOT NULL DEFAULT 0,
	`successful_requests` int NOT NULL DEFAULT 0,
	`failed_requests` int NOT NULL DEFAULT 0,
	`autocomplete_requests` int NOT NULL DEFAULT 0,
	`place_details_requests` int NOT NULL DEFAULT 0,
	`geocode_requests` int NOT NULL DEFAULT 0,
	`reverse_geocode_requests` int NOT NULL DEFAULT 0,
	`average_response_time_ms` decimal(10,2),
	`total_cost_usd` decimal(10,4),
	CONSTRAINT `google_places_api_daily_summary_id` PRIMARY KEY(`id`),
	CONSTRAINT `google_places_api_daily_summary_date_uq` UNIQUE(`date`)
);
--> statement-breakpoint

CREATE INDEX `idx_gpads_date` ON `google_places_api_daily_summary` (`date`);
--> statement-breakpoint

CREATE TABLE `google_places_api_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_type` enum('usage_threshold','error_rate','cost_threshold','response_time') NOT NULL,
	`threshold_value` decimal(10,2) NOT NULL,
	`current_value` decimal(10,2) NOT NULL,
	`triggered_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`resolved_at` timestamp,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'warning',
	`message` text NOT NULL,
	`notified` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `google_places_api_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE INDEX `idx_gpaa_triggered` ON `google_places_api_alerts` (`triggered_at`);
--> statement-breakpoint
CREATE INDEX `idx_gpaa_type` ON `google_places_api_alerts` (`alert_type`);
--> statement-breakpoint
CREATE INDEX `idx_gpaa_severity` ON `google_places_api_alerts` (`severity`);
--> statement-breakpoint
CREATE INDEX `idx_gpaa_resolved` ON `google_places_api_alerts` (`resolved_at`);
--> statement-breakpoint

CREATE TABLE `google_places_api_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_key` varchar(100) NOT NULL,
	`config_value` text NOT NULL,
	`description` text,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `google_places_api_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `google_places_api_config_key_uq` UNIQUE(`config_key`)
);
--> statement-breakpoint

CREATE INDEX `idx_gpac_key` ON `google_places_api_config` (`config_key`);
--> statement-breakpoint

INSERT INTO `google_places_api_config` (`config_key`, `config_value`, `description`) VALUES
	('daily_request_limit', '10000', 'Maximum number of API requests allowed per day'),
	('usage_alert_threshold', '0.8', 'Trigger alert when usage exceeds this percentage of daily limit (0.8 = 80%)'),
	('error_rate_threshold', '0.05', 'Trigger alert when error rate exceeds this percentage (0.05 = 5%)'),
	('response_time_threshold', '3000', 'Trigger alert when average response time exceeds this value in milliseconds'),
	('cost_alert_threshold', '100', 'Trigger alert when daily cost exceeds this value in USD'),
	('autocomplete_cost_per_1000', '2.83', 'Cost per 1000 autocomplete requests in USD'),
	('place_details_cost_per_1000', '17.00', 'Cost per 1000 place details requests in USD'),
	('geocode_cost_per_1000', '5.00', 'Cost per 1000 geocode requests in USD')
ON DUPLICATE KEY UPDATE
	`config_value` = VALUES(`config_value`),
	`description` = VALUES(`description`);
