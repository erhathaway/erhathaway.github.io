CREATE TABLE `artifact_metadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`artifact_id` integer NOT NULL,
	`metadata` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`artifact_id`) REFERENCES `project_artifacts`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `artifact_metadata_artifact_id_unique` ON `artifact_metadata` (`artifact_id`);
