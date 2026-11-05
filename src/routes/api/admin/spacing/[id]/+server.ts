import { error, json } from '@sveltejs/kit';
import { saveSpacing } from '$lib/server/spacing';
import type { RequestHandler } from './$types';
export const PATCH: RequestHandler = async ({ locals, request, params }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await saveSpacing(locals.db, await request.json(), params.id));
};
