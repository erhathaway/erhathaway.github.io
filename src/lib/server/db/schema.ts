import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const projects = sqliteTable('projects', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	displayName: text('display_name').notNull(),
	description: text('description'),
	isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
	sortOrder: integer('sort_order').notNull().default(0)
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
	isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
	sortOrder: integer('sort_order').notNull().default(0)
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
		.references(() => projectArtifacts.id, { onDelete: 'cascade' }),
	positionX: real('position_x').notNull().default(50),
	positionY: real('position_y').notNull().default(50),
	zoom: real('zoom').notNull().default(1)
});

export const integrations = sqliteTable('integrations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	provider: text('provider').notNull().unique(),
	userId: text('user_id').notNull(),
	tokens: text('tokens').notNull(),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
});

export const siteSettings = sqliteTable('site_settings', {
	key: text('key').primaryKey(),
	value: text('value', { mode: 'json' }).notNull(),
	updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
});

export const botCheckins = sqliteTable('bot_checkins', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	identifier: text('identifier').notNull(),
	userAgent: text('user_agent').notNull(),
	payload: text('payload').notNull(),
	ipAddress: text('ip_address'),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
});

export const botMessages = sqliteTable('bot_messages', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	botIdentifier: text('bot_identifier').notNull(),
	message: text('message').notNull(),
	isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
	createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
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
