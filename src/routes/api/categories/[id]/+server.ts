import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { categories } from '$lib/server/db/schema';
import { verifyClerkAuth } from '$lib/server/auth';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

type CategoryInput = {
	name: string;
	displayName: string;
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
		throw error(400, 'Invalid category id');
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
		? eq(categories.id, id)
		: and(eq(categories.id, id), eq(categories.isPublished, true));

	const [row] = await db.select().from(categories).where(where);
	if (!row) {
		throw error(404, 'Category not found');
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
	const payload = (await request.json()) as Partial<CategoryInput>;
	const name = payload.name?.trim();
	const displayName = payload.displayName?.trim();
	const isPublished = payload.isPublished;

	if (!name || !displayName) {
		throw error(400, 'name and displayName are required');
	}

	const [updated] = await db
		.update(categories)
		.set({
			name,
			displayName,
			isPublished: isPublished ?? false
		})
		.where(eq(categories.id, id))
		.returning();

	if (!updated) {
		throw error(404, 'Category not found');
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
	const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning();

	if (!deleted) {
		throw error(404, 'Category not found');
	}

	return json({ success: true }, { headers: corsHeaders });
};
