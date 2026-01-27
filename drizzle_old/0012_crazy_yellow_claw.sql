ALTER TABLE `developments` ADD `subtitle` varchar(255);--> statement-breakpoint
ALTER TABLE `developments` ADD `meta_title` varchar(255);--> statement-breakpoint
ALTER TABLE `developments` ADD `meta_description` text;--> statement-breakpoint
ALTER TABLE `developments` ADD `legacy_status` enum('now-selling','launching-soon','under-construction','ready-to-move','sold-out','phase-completed','new-phase-launching','planning','completed','coming_soon','pre_launch','ready');--> statement-breakpoint
ALTER TABLE `developments` ADD `construction_phase` enum('planning','under_construction','completed','phase_completed');