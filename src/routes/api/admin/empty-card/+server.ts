import { error, json } from '@sveltejs/kit';
import { listEmptyCard, saveEmptyCard } from '$lib/server/empty-card';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await listEmptyCard(locals.db), { headers: { 'Cache-Control': 'no-store' } });
};
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await saveEmptyCard(locals.db, await request.json()), { status: 201 });
};
