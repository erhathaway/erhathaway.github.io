import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { verifyClerkAuth } from '$lib/server/auth';
import { buildOAuthUrl } from '$lib/server/integrations/google-photos';

export const GET: RequestHandler = async ({ request, platform, url }) => {
	// Support auth via query param since this is a browser redirect
	const authToken = url.searchParams.get('_auth');
	let userId: string | null = null;

	if (authToken) {
		// Build a fake request with the Authorization header for verification
		const authRequest = new Request(request.url, {
			headers: { Authorization: `Bearer ${authToken}` }
		});
		userId = await verifyClerkAuth(authRequest, platform?.env);
	} else {
		userId = await verifyClerkAuth(request, platform?.env);
	}

	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const clientId = platform?.env?.GOOGLE_CLIENT_ID;
	if (!clientId) {
		throw error(500, 'Google client ID not configured');
	}

	const redirectUri = `${url.origin}/api/integrations/google-photos/callback`;
	const oauthUrl = buildOAuthUrl({ GOOGLE_CLIENT_ID: clientId }, redirectUri);

	throw redirect(302, oauthUrl);
};
