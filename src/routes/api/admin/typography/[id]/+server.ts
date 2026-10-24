import { error, json } from '@sveltejs/kit';
import { saveTypography } from '$lib/server/typography';
import type { RequestHandler } from './$types';
export const PATCH: RequestHandler = async ({ locals, request, params }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await saveTypography(locals.db, await request.json(), params.id));
};
