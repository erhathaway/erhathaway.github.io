CREATE TABLE `bot_checkins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identifier` text NOT NULL,
	`user_agent` text NOT NULL,
	`payload` text NOT NULL,
	`ip_address` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bot_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bot_identifier` text NOT NULL,
	`message` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
