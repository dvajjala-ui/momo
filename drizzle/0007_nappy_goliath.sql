CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`subject_id` text NOT NULL,
	`note` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_admin_audit_created` ON `admin_audit` (`created`);--> statement-breakpoint
CREATE TABLE `direct_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_a` text NOT NULL,
	`user_b` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_direct_a` ON `direct_threads` (`user_a`);--> statement-breakpoint
CREATE INDEX `idx_direct_b` ON `direct_threads` (`user_b`);--> statement-breakpoint
CREATE TABLE `event_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`confirmed_by` text NOT NULL,
	`attended_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_attendance_user` ON `event_attendance` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_event` ON `event_attendance` (`event_id`);--> statement-breakpoint
CREATE TABLE `member_controls` (
	`user_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`reason` text,
	`updated` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `dm_opt_in` integer DEFAULT 0 NOT NULL;