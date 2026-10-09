CREATE TABLE `email_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`last` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`revision` text NOT NULL,
	`unsubscribe_hash` text,
	`message_id` text,
	`status` text NOT NULL,
	`error` text,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_email_deliveries_user` ON `email_deliveries` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_email_deliveries_unsubscribe` ON `email_deliveries` (`unsubscribe_hash`);--> statement-breakpoint
CREATE TABLE `email_invites` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`city` text NOT NULL,
	`event_id` text,
	`consent` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`food_theme` text DEFAULT 'momo' NOT NULL,
	`letter_style` text DEFAULT 'notebook' NOT NULL,
	`revision` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	`verified_at` integer,
	`verify_hash` text,
	`verify_expires` integer
);
--> statement-breakpoint
CREATE INDEX `idx_email_invites_verify` ON `email_invites` (`verify_hash`);