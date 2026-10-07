CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`host` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `wish_joins` (
	`id` text PRIMARY KEY NOT NULL,
	`wish_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_wish_joins_wish` ON `wish_joins` (`wish_id`);--> statement-breakpoint
CREATE INDEX `idx_wish_joins_user` ON `wish_joins` (`user_id`);--> statement-breakpoint
CREATE TABLE `wishes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`when_text` text NOT NULL,
	`area` text NOT NULL,
	`spots` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_wishes_created` ON `wishes` (`created`);--> statement-breakpoint
CREATE INDEX `idx_wishes_user` ON `wishes` (`user_id`);--> statement-breakpoint
ALTER TABLE `invites` ADD `letter_style` text DEFAULT 'notebook' NOT NULL;