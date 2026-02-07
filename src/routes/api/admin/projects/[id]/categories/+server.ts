import type { RequestHandler } from './$types';
import { and, eq, inArray } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { categories, projectCategories, projects } from '$lib/server/db/schema';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) {
		throw error(500, 'Database not available');
	}
	return db;
};

const parseId = (raw: string) => {
	const id = Number(raw);
	if (!Number.isInteger(id) || id <= 0) {
		throw error(400, 'Invalid project id');
	}
	return id;
};

const parseCategoryIds = (payload: unknown) => {
	if (!payload || typeof payload !== 'object' || !('category_ids' in payload)) {
		throw error(400, 'category_ids is required');
	}
	const raw = (payload as { category_ids: unknown }).category_ids;
	if (!Array.isArray(raw)) {
		throw error(400, 'category_ids must be an array');
	}
	const ids = raw.map((value) => Number(value));
	if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
		throw error(400, 'category_ids must be positive integers');
	}
	return Array.from(new Set(ids));
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ params, locals }) => {
	const db = getDbOrThrow(locals.db);
	const projectId = parseId(params.id);

	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
	if (!project) {
		throw error(404, 'Project not found');
	}

	const rows = await db
		.select({
			id: categories.id,
			name: categories.name,
			displayName: categories.displayName,
			isPublished: categories.isPublished
		})
		.from(projectCategories)
		.innerJoin(categories, eq(projectCategories.categoryId, categories.id))
		.where(eq(projectCategories.projectId, projectId));

	return json(rows, { headers: corsHeaders });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const db = getDbOrThrow(locals.db);
	const projectId = parseId(params.id);
	const ids = parseCategoryIds(await request.json());

	if (ids.length === 0) {
		return json({ success: true }, { headers: corsHeaders });
	}

	await db
		.insert(projectCategories)
		.values(ids.map((categoryId) => ({ projectId, categoryId })))
		.onConflictDoNothing();

	return json({ success: true }, { headers: corsHeaders });
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	const db = getDbOrThrow(locals.db);
	const projectId = parseId(params.id);
	const ids = parseCategoryIds(await request.json());

	if (ids.length === 0) {
		return json({ success: true }, { headers: corsHeaders });
	}

	await db
		.delete(projectCategories)
		.where(and(eq(projectCategories.projectId, projectId), inArray(projectCategories.categoryId, ids)));

	return json({ success: true }, { headers: corsHeaders });
};
