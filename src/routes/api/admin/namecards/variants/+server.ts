import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listNamecardVariants, saveNamecardVariant } from '$lib/server/namecard-variants';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.db) throw error(500, 'Database not available');
	return json(await listNamecardVariants(locals.db));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.db) throw error(500, 'Database not available');
	return json(await saveNamecardVariant(locals.db, await request.json()), { status: 201 });
};
