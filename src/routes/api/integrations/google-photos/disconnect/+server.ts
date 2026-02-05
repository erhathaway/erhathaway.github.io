import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { verifyClerkAuth } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import {
	getStoredTokens,
	deleteStoredTokens,
	revokeToken
} from '$lib/server/integrations/google-photos';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const userId = await verifyClerkAuth(request, platform?.env);
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const env = platform?.env;
	if (!env?.GOOGLE_TOKEN_ENCRYPTION_KEY) {
		throw error(500, 'Google integration not configured');
	}

	const db = env?.DB ? getDb(env.DB as unknown as import('@cloudflare/workers-types').D1Database) : null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	try {
		const tokens = await getStoredTokens(db, env.GOOGLE_TOKEN_ENCRYPTION_KEY);
		if (tokens) {
			await revokeToken(tokens.access_token).catch(() => {});
		}
	} catch {
		// Token may already be invalid, continue with deletion
	}

	await deleteStoredTokens(db);

	return json({ success: true }, { headers: corsHeaders });
};
