import { error, json } from '@sveltejs/kit';
import { listSpacing, saveSpacing } from '$lib/server/spacing';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await listSpacing(locals.db), { headers: { 'Cache-Control': 'no-store' } });
};
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await saveSpacing(locals.db, await request.json()), { status: 201 });
};
