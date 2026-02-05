import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { verifyClerkAuth } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import {
	getValidAccessToken,
	listPickedMediaItems
} from '$lib/server/integrations/google-photos';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ request, locals, platform, params, url }) => {
	const userId = await verifyClerkAuth(request, platform?.env);
	const authUserId = locals.auth?.()?.userId ?? null;
	if (!userId && !authUserId) {
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

	const pageToken = url.searchParams.get('pageToken') ?? undefined;
	const pageSize = Math.min(Number(url.searchParams.get('pageSize') ?? 100), 100);

	try {
		const accessToken = await getValidAccessToken(db, {
			GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
			GOOGLE_TOKEN_ENCRYPTION_KEY: env.GOOGLE_TOKEN_ENCRYPTION_KEY
		});

		const result = await listPickedMediaItems(accessToken, params.sessionId, pageToken, pageSize);

		// Proxy thumbnail URLs: replace baseUrl with our proxied version
		// since baseUrls require OAuth auth headers that browsers can't send via <img src>
		const items = (result.mediaItems ?? []).map((item) => ({
			...item,
			thumbnailUrl: `/api/integrations/google-photos/sessions/${params.sessionId}/items/thumbnail?baseUrl=${encodeURIComponent(item.mediaFile.baseUrl)}&type=${item.type}`
		}));

		return json(
			{ mediaItems: items, nextPageToken: result.nextPageToken },
			{ headers: corsHeaders }
		);
	} catch (err) {
		console.error('Failed to list picked items:', err);
		const message = err instanceof Error ? err.message : 'Failed to list items';
		throw error(502, message);
	}
};
