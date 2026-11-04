import { error, json } from '@sveltejs/kit';
import { activateEmptyCard } from '$lib/server/empty-card';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await activateEmptyCard(locals.db, params.id));
};
