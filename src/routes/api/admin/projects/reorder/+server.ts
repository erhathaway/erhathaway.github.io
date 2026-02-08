import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { projects } from '$lib/server/db/schema';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'PUT, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) throw error(500, 'Database not available');
	return db;
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const db = getDbOrThrow(locals.db);

	const body = await request.json();
	const ids: number[] = body.ids;

	if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'number')) {
		throw error(400, 'ids must be an array of numbers');
	}

	for (let i = 0; i < ids.length; i++) {
		await db
			.update(projects)
			.set({ sortOrder: i })
			.where(eq(projects.id, ids[i]));
	}

	return json({ ok: true }, { headers: corsHeaders });
};
