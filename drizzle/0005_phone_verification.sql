CREATE TABLE `phone_verifications` (
	`user_id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`code_hash` text,
	`expires` integer NOT NULL,
	`created` integer NOT NULL,
	`verified_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_phone_verifications_code` ON `phone_verifications` (`code_hash`,`phone`);