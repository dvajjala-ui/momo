CREATE TABLE `nickname_claims` (
	`nickname_key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL UNIQUE
);
--> statement-breakpoint
INSERT OR IGNORE INTO nickname_claims(nickname_key,user_id)
SELECT lower(trim(nickname)),id FROM profiles ORDER BY created,id;
--> statement-breakpoint
INSERT OR IGNORE INTO member_controls(user_id,status,reason,updated)
SELECT id,'active',NULL,created FROM profiles ORDER BY created,id;
--> statement-breakpoint
CREATE TABLE `host_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL,
	`read_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_host_messages_user_created` ON `host_messages` (`user_id`,`created`);
--> statement-breakpoint
CREATE TABLE `sidekick_applications` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`city` text NOT NULL,
	`help_with` text NOT NULL,
	`about` text NOT NULL,
	`status` text NOT NULL DEFAULT 'new',
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `host_login_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`attempts` integer NOT NULL
);
