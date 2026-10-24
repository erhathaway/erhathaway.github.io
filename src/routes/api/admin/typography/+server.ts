import { error, json } from '@sveltejs/kit';
import { listTypography, saveTypography } from '$lib/server/typography';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await listTypography(locals.db), { headers: { 'Cache-Control': 'no-store' } });
};
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.db) throw error(500, 'Database unavailable');
	return json(await saveTypography(locals.db, await request.json()), { status: 201 });
};
