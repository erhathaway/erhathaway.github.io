import { error, json } from '@sveltejs/kit';
import { setProjectNamecardBackground } from '$lib/server/project-namecard';
import type { RequestHandler } from './$types';
export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	const body = (await request.json()) as { showBackground?: unknown } | null;
	return json(await setProjectNamecardBackground(locals.db, body?.showBackground));
};
