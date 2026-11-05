import { error, json } from '@sveltejs/kit';
import { activateHoverCard } from '$lib/server/hover-card';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await activateHoverCard(locals.db, params.id));
};
