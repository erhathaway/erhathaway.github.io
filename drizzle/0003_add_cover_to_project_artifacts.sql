CREATE TABLE `project_cover_artifact` (
	`project_id` integer NOT NULL,
	`artifact_id` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`artifact_id`) REFERENCES `project_artifacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_cover_artifact_project_id_unique` ON `project_cover_artifact` (`project_id`);
