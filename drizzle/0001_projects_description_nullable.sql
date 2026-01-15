CREATE TABLE `projects__new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`is_published` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
INSERT INTO `projects__new` (`id`, `name`, `display_name`, `description`, `is_published`)
SELECT `id`, `name`, `display_name`, `description`, `is_published` FROM `projects`;
--> statement-breakpoint
DROP TABLE `projects`;
--> statement-breakpoint
ALTER TABLE `projects__new` RENAME TO `projects`;
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_name_unique` ON `projects` (`name`);
