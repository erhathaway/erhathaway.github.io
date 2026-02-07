import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { buildOAuthUrl } from '$lib/server/integrations/google-photos';

export const GET: RequestHandler = async ({ locals, platform, url }) => {
	// This is a browser redirect, so Clerk middleware provides auth via cookies.
	// The centralized admin auth guard in hooks.server.ts also covers this route,
	// but we keep the explicit check since browser-redirect auth uses locals.auth() only.
	const userId = locals.auth?.()?.userId ?? null;

	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const clientId = platform?.env?.GOOGLE_CLIENT_ID;
	if (!clientId) {
		throw error(500, 'Google client ID not configured');
	}

	// Redirect URI stays at the original callback location (not under /api/admin/)
	// because this URL is registered in Google's OAuth configuration.
	const redirectUri = `${url.origin}/api/integrations/google-photos/callback`;
	const oauthUrl = buildOAuthUrl({ GOOGLE_CLIENT_ID: clientId }, redirectUri);

	throw redirect(302, oauthUrl);
};
