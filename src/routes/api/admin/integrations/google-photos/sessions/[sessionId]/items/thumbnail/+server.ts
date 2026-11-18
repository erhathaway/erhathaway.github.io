import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { getValidAccessToken, fetchGoogleMedia, validateGoogleMediaUrl } from '$lib/server/integrations/google-photos';

export const GET: RequestHandler = async ({ platform, url }) => {
	const baseUrl = url.searchParams.get('baseUrl');
	if (!baseUrl) {
		throw error(400, 'baseUrl is required');
	}

	validateGoogleMediaUrl(baseUrl);
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

		const thumbnailResponse = await fetchGoogleMedia(accessToken, baseUrl, '=w256-h256-c');

		const contentType = thumbnailResponse.headers.get('Content-Type') ?? 'image/jpeg';
		const body = await thumbnailResponse.arrayBuffer();

		return new Response(body, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'private, no-store',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Thumbnail proxy error:', err);
		throw error(502, 'Failed to proxy thumbnail');
	}
};
