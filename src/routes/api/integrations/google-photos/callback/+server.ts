import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { consumeGoogleOAuth } from '$lib/server/integrations/google-oauth';
import { getDb } from '$lib/server/db';
import {
	exchangeCodeForTokens,
	storeTokens
} from '$lib/server/integrations/google-photos';

export const GET: RequestHandler = async ({ url, platform, locals, cookies }) => {
	const userId = requireAdmin(locals, platform?.env);
	const verifier = consumeGoogleOAuth(cookies, url, userId);
	const errorParam = url.searchParams.get('error');
	if (errorParam) {
		const message = errorParam === 'access_denied'
			? 'Google Photos access was not granted. Connect again and allow access to continue.'
			: 'Google Photos could not connect. Please try again.';
		throw redirect(302, `/admin/integrations/google-photos?error=${encodeURIComponent(message)}`);
	}

	const code = url.searchParams.get('code');
	if (!code) {
		throw error(400, 'Missing authorization code');
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
		}, verifier);

		await storeTokens(db, userId, tokens, env.GOOGLE_TOKEN_ENCRYPTION_KEY);
	} catch {
		console.error('Google Photos token exchange failed');
		const message = 'Google Photos could not connect. Please start Connect again.';
		throw redirect(302, `/admin/integrations/google-photos?error=${encodeURIComponent(message)}`);
	}

	throw redirect(302, '/admin/integrations/google-photos?connected=true');
};
