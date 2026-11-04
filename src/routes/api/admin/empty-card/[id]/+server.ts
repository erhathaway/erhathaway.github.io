import { error, json } from '@sveltejs/kit';
import { saveEmptyCard } from '$lib/server/empty-card';
import type { RequestHandler } from './$types';
export const PATCH: RequestHandler = async ({ locals, request, params }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await saveEmptyCard(locals.db, await request.json(), params.id));
};
