import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promoteNamecardVariant } from '$lib/server/namecard-variants';

export const POST: RequestHandler = async ({ locals, request, params }) => {
	if (!locals.db) throw error(500, 'Database not available');
	const body = await request.json();
	return json(await promoteNamecardVariant(locals.db, params.id, body?.target));
};
