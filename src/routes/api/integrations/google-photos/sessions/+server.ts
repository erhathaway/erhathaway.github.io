import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { verifyClerkAuth } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import {
	getValidAccessToken,
	createPickerSession
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
	if (!env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET || !env?.GOOGLE_TOKEN_ENCRYPTION_KEY) {
		throw error(500, 'Google integration not configured');
	}

	const db = env?.DB ? getDb(env.DB as unknown as import('@cloudflare/workers-types').D1Database) : null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	try {
		const accessToken = await getValidAccessToken(db, {
			GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
			GOOGLE_TOKEN_ENCRYPTION_KEY: env.GOOGLE_TOKEN_ENCRYPTION_KEY
		});

		const session = await createPickerSession(accessToken);

		return json(
			{
				sessionId: session.id,
				pickerUri: session.pickerUri,
				pollingConfig: session.pollingConfig
			},
			{ headers: corsHeaders }
		);
	} catch (err) {
		console.error('Failed to create picker session:', err);
		const message = err instanceof Error ? err.message : 'Failed to create session';
		throw error(502, message);
	}
};
