import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import {
	exchangeCodeForTokens,
	storeTokens
} from '$lib/server/integrations/google-photos';

export const GET: RequestHandler = async ({ url, platform }) => {
	const code = url.searchParams.get('code');
	if (!code) {
		throw error(400, 'Missing authorization code');
	}

	const errorParam = url.searchParams.get('error');
	if (errorParam) {
		throw redirect(302, `/admin/integrations/google-photos?error=${encodeURIComponent(errorParam)}`);
	}

	const env = platform?.env;
	if (!env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET || !env?.GOOGLE_TOKEN_ENCRYPTION_KEY) {
		throw error(500, 'Google integration not configured');
	}

	const db = env?.DB ? getDb(env.DB as unknown as import('@cloudflare/workers-types').D1Database) : null;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const redirectUri = `${url.origin}/api/integrations/google-photos/callback`;

	try {
		const tokens = await exchangeCodeForTokens(code, redirectUri, {
			GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET
		});

		await storeTokens(db, 'admin', tokens, env.GOOGLE_TOKEN_ENCRYPTION_KEY);
	} catch (err) {
		console.error('OAuth callback error:', err);
		const message = err instanceof Error ? err.message : 'Token exchange failed';
		throw redirect(302, `/admin/integrations/google-photos?error=${encodeURIComponent(message)}`);
	}

	throw redirect(302, '/admin/integrations/google-photos?connected=true');
};
