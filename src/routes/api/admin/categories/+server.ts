import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { categories } from '$lib/server/db/schema';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ locals }) => {
	const db = getDbOrThrow(locals.db);
	const rows = await db.select().from(categories);
	return json(rows, { headers: corsHeaders });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const db = getDbOrThrow(locals.db);

	const payload = (await request.json()) as Partial<CategoryInput>;
	const name = payload.name?.trim();
	const displayName = payload.displayName?.trim() || name;

	if (!name) {
		throw error(400, 'name is required');
	}

	const isPublished = payload.isPublished ?? false;

	const [created] = await db
		.insert(categories)
		.values({ name, displayName, isPublished })
		.returning();

	return json(created, { status: 201, headers: corsHeaders });
};
