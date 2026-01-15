CREATE TABLE `project_attributes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`show_in_nav` integer DEFAULT false NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_attributes_project_id_idx` ON `project_attributes` (`project_id`);
