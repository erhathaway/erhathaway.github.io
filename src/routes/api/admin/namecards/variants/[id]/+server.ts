import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeNamecardVariant } from '$lib/server/namecard-variants';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.db) throw error(500, 'Database not available');
	await removeNamecardVariant(locals.db, params.id);
	return json({ ok: true });
};
