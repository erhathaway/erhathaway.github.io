import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { categories } from '$lib/server/db/schema';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
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
	const rows = await db.select().from(categories).where(eq(categories.isPublished, true));
	return json(rows, { headers: corsHeaders });
};
