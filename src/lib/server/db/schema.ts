import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	displayName: text('display_name').notNull(),
	description: text('description').notNull()
});

export const categories = sqliteTable('categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	displayName: text('display_name').notNull()
});

export const projectCategories = sqliteTable('project_categories', {
	projectId: integer('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	categoryId: integer('category_id')
		.notNull()
		.references(() => categories.id, { onDelete: 'cascade' })
}, (table) => ({
	pk: primaryKey({ columns: [table.projectId, table.categoryId] })
}));

export const projectArtifacts = sqliteTable('project_artifacts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	projectId: integer('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	schemaVersion: integer('schema_version').notNull(),
	dataBlob: text('data_blob', { mode: 'json' }).notNull()
});
