import { error, json } from '@sveltejs/kit';
import { saveHoverCard } from '$lib/server/hover-card';
import type { RequestHandler } from './$types';
export const PATCH: RequestHandler = async ({ locals, request, params }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await saveHoverCard(locals.db, await request.json(), params.id));
};
