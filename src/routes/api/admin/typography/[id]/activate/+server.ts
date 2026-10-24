import { error, json } from '@sveltejs/kit';
import { activateTypography } from '$lib/server/typography';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await activateTypography(locals.db, params.id));
};
