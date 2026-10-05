CREATE TABLE `deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`message_id` text,
	`status` text NOT NULL,
	`error` text,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_deliveries_message` ON `deliveries` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_deliveries_user_created` ON `deliveries` (`user_id`,`created`);--> statement-breakpoint
ALTER TABLE `invites` ADD `food_theme` text DEFAULT 'momo' NOT NULL;