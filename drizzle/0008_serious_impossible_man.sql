CREATE TABLE `chat_send_limits` (
	`user_id` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`sent` integer NOT NULL,
	`last_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_send_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`body_hash` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chat_receipts_user` ON `chat_send_receipts` (`user_id`);