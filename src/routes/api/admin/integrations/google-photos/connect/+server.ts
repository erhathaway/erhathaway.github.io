import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth';
import { beginGoogleOAuth } from '$lib/server/integrations/google-oauth';
import { buildOAuthUrl } from '$lib/server/integrations/google-photos';

export const GET: RequestHandler = async ({ locals, platform, url, cookies }) => {
	const userId = requireAdmin(locals, platform?.env);

	const clientId = platform?.env?.GOOGLE_CLIENT_ID;
	if (!clientId) {
		throw error(500, 'Google client ID not configured');
	}

	// Redirect URI stays at the original callback location (not under /api/admin/)
	// because this URL is registered in Google's OAuth configuration.
	const redirectUri = `${url.origin}/api/integrations/google-photos/callback`;
	const flow = await beginGoogleOAuth(cookies, url, userId);
	const oauthUrl = buildOAuthUrl({ GOOGLE_CLIENT_ID: clientId }, redirectUri, flow);

	throw redirect(302, oauthUrl);
};
