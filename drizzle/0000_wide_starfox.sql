CREATE TABLE `blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`blocked_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_blocks_user` ON `blocks` (`user_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`venue` text NOT NULL,
	`cost` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gallery` (
	`id` text PRIMARY KEY NOT NULL,
	`caption` text NOT NULL,
	`category` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`user_id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`city` text NOT NULL,
	`event_id` text,
	`consent` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`room` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_messages_room_created` ON `messages` (`room`,`created`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`avatar` integer DEFAULT 0 NOT NULL,
	`photo` text,
	`last_message` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message_id` text NOT NULL,
	`reason` text NOT NULL,
	`created` integer NOT NULL
);
