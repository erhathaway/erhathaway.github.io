import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	displayName: text('display_name').notNull(),
	description: text('description'),
	isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false)
});

export const categories = sqliteTable('categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	displayName: text('display_name').notNull(),
	isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false)
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
	schema: text('schema').notNull(),
	dataBlob: text('data_blob', { mode: 'json' }).notNull(),
	isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false)
});

export const projectAttributes = sqliteTable('project_attributes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	projectId: integer('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	value: text('value').notNull(),
	showInNav: integer('show_in_nav', { mode: 'boolean' }).notNull().default(false),
	isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false)
});
