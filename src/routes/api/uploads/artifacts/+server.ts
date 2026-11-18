import type { RequestHandler } from './$types';
import { error, redirect } from '@sveltejs/kit';

// Legacy image URLs must go through the same publication/owner check as new URLs.
export const GET: RequestHandler = async ({ url }) => {
	const key = url.searchParams.get('key');
	if (!key || !/^artifacts\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(key)) {
		error(400, 'Invalid artifact key');
	}
	redirect(307, `/${key}`);
};
