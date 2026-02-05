import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { verifyClerkAuth } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import {
	getValidAccessToken,
	getPickerSession,
	deletePickerSession
} from '$lib/server/integrations/google-photos';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

function getGoogleEnv(env: App.Platform['env'] | undefined) {
	if (!env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET || !env?.GOOGLE_TOKEN_ENCRYPTION_KEY) {
		throw error(500, 'Google integration not configured');
	}
	return {
		GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
		GOOGLE_TOKEN_ENCRYPTION_KEY: env.GOOGLE_TOKEN_ENCRYPTION_KEY
	};
}

export const GET: RequestHandler = async ({ request, platform, params }) => {
	const userId = await verifyClerkAuth(request, platform?.env);
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const env = platform?.env;
	const googleEnv = getGoogleEnv(env);

	const db = env?.DB ? getDb(env.DB as unknown as import('@cloudflare/workers-types').D1Database) : null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	try {
		const accessToken = await getValidAccessToken(db, googleEnv);
		const session = await getPickerSession(accessToken, params.sessionId);

		return json(
			{
				mediaItemsSet: session.mediaItemsSet,
				pollingConfig: session.pollingConfig,
				expireTime: session.expireTime
			},
			{ headers: corsHeaders }
		);
	} catch (err) {
		console.error('Failed to poll picker session:', err);
		const message = err instanceof Error ? err.message : 'Failed to poll session';
		throw error(502, message);
	}
};

export const DELETE: RequestHandler = async ({ request, platform, params }) => {
	const userId = await verifyClerkAuth(request, platform?.env);
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const env = platform?.env;
	const googleEnv = getGoogleEnv(env);

	const db = env?.DB ? getDb(env.DB as unknown as import('@cloudflare/workers-types').D1Database) : null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	try {
		const accessToken = await getValidAccessToken(db, googleEnv);
		await deletePickerSession(accessToken, params.sessionId);
		return json({ success: true }, { headers: corsHeaders });
	} catch (err) {
		console.error('Failed to delete picker session:', err);
		return json({ success: true }, { headers: corsHeaders });
	}
};
