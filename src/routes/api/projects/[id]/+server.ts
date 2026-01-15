import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { projects } from '$lib/server/db/schema';
import { verifyClerkAuth } from '$lib/server/auth';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

type ProjectInput = {
	name: string;
	displayName: string;
	description: string;
	isPublished?: boolean;
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

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ params, request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	const id = parseId(params.id);

	const where = userId || authUserId
		? eq(projects.id, id)
		: and(eq(projects.id, id), eq(projects.isPublished, true));

	const [row] = await db.select().from(projects).where(where);
	if (!row) {
		throw error(404, 'Project not found');
	}

	return json(row, { headers: corsHeaders });
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

	const id = parseId(params.id);
	const payload = (await request.json()) as Partial<ProjectInput>;
	const name = payload.name?.trim();
	const displayName = payload.displayName?.trim() || name;
	const description = payload.description?.trim();
	const isPublished = payload.isPublished;

	if (!name || !description) {
		throw error(400, 'name and description are required');
	}

	const [updated] = await db
		.update(projects)
		.set({
			name,
			displayName,
			description,
			isPublished: isPublished ?? false
		})
		.where(eq(projects.id, id))
		.returning();

	if (!updated) {
		throw error(404, 'Project not found');
	}

	return json(updated, { headers: corsHeaders });
};

export const DELETE: RequestHandler = async ({ params, request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

	const id = parseId(params.id);
	const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning();

	if (!deleted) {
		throw error(404, 'Project not found');
	}

	return json({ success: true }, { headers: corsHeaders });
};
