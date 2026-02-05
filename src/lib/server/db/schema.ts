import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

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

export const projectCoverArtifact = sqliteTable('project_cover_artifact', {
	projectId: integer('project_id')
		.notNull()
		.unique()
		.references(() => projects.id, { onDelete: 'cascade' }),
	artifactId: integer('artifact_id')
		.notNull()
		.references(() => projectArtifacts.id, { onDelete: 'cascade' })
});

export const integrations = sqliteTable('integrations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	provider: text('provider').notNull().unique(),
	userId: text('user_id').notNull(),
	tokens: text('tokens').notNull(),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
});

export const artifactMetadata = sqliteTable('artifact_metadata', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	artifactId: integer('artifact_id')
		.notNull()
		.unique()
		.references(() => projectArtifacts.id, { onDelete: 'cascade' }),
	metadata: text('metadata', { mode: 'json' }).notNull(),
	source: text('source').notNull(),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
});
