import { error, json } from '@sveltejs/kit';
import { listHoverCard, saveHoverCard } from '$lib/server/hover-card';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await listHoverCard(locals.db), { headers: { 'Cache-Control': 'no-store' } });
};
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await saveHoverCard(locals.db, await request.json()), { status: 201 });
};
