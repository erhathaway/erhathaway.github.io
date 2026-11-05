import { error, json } from '@sveltejs/kit';
import { activateSpacing } from '$lib/server/spacing';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await activateSpacing(locals.db, params.id));
};
