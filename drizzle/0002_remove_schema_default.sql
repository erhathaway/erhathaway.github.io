PRAGMA foreign_keys=off;

CREATE TABLE `project_artifacts__temp` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`schema` text NOT NULL,
	`data_blob` text NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `project_artifacts__temp` (`id`, `project_id`, `schema`, `data_blob`, `is_published`)
SELECT `id`, `project_id`, `schema`, `data_blob`, `is_published`
FROM `project_artifacts`;

DROP TABLE `project_artifacts`;
ALTER TABLE `project_artifacts__temp` RENAME TO `project_artifacts`;

PRAGMA foreign_keys=on;
