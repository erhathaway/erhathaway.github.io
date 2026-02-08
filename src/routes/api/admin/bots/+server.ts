import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { botCheckins } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

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

export const GET: RequestHandler = async ({ locals }) => {
	const db = getDbOrThrow(locals.db);

	const rows = await db
		.select({
			identifier: botCheckins.identifier,
			latestUserAgent: sql<string>`MAX(${botCheckins.userAgent})`,
			latestPayload: sql<string>`(SELECT ${botCheckins.payload} FROM ${botCheckins} AS bc2 WHERE bc2.identifier = ${botCheckins.identifier} ORDER BY bc2.created_at DESC LIMIT 1)`,
			count: sql<number>`count(*)`,
			firstSeen: sql<string>`MIN(${botCheckins.createdAt})`,
			lastSeen: sql<string>`MAX(${botCheckins.createdAt})`
		})
		.from(botCheckins)
		.groupBy(botCheckins.identifier)
		.orderBy(sql`MAX(${botCheckins.createdAt}) DESC`);

	return json(rows, { headers: corsHeaders });
};
