import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { botCheckins } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) throw error(500, 'Database not available');
	return db;
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ params, locals }) => {
	const db = getDbOrThrow(locals.db);
	const { identifier } = params;

	if (!/^[0-9a-f]{16}$/.test(identifier)) {
		throw error(400, 'Invalid identifier format');
	}

	const checkins = await db
		.select()
		.from(botCheckins)
		.where(eq(botCheckins.identifier, identifier))
		.orderBy(desc(botCheckins.createdAt));

	return json(checkins, { headers: corsHeaders });
};
