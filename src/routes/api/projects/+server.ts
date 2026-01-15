import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
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

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	const rows = userId || authUserId
		? await db.select().from(projects)
		: await db.select().from(projects).where(eq(projects.isPublished, true));

	return json(rows, { headers: corsHeaders });
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const db = getDbOrThrow(locals.db);
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
		throw error(401, 'Unauthorized');
	}

	const payload = (await request.json()) as Partial<ProjectInput>;
	const name = payload.name?.trim();
	const displayName = payload.displayName?.trim() || name;
	const description = payload.description?.trim() || null;

	if (!name) {
		throw error(400, 'name is required');
	}

	const isPublished = payload.isPublished ?? false;

	const [created] = await db
		.insert(projects)
		.values({ name, displayName, description, isPublished })
		.returning();

	return json(created, { status: 201, headers: corsHeaders });
};
