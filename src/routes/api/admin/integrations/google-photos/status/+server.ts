import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { getIntegrationStatus } from '$lib/server/integrations/google-photos';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ platform }) => {
	const env = platform?.env;
	const db = env?.DB ? getDb(env.DB as unknown as import('@cloudflare/workers-types').D1Database) : null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const status = await getIntegrationStatus(db);
	return json(status, { headers: corsHeaders });
};
