import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeNamecardVariant, saveNamecardVariant } from '$lib/server/namecard-variants';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.db) throw error(500, 'Database not available');
	await removeNamecardVariant(locals.db, params.id);
	return json({ ok: true });
};

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.db) throw error(500, 'Database not available');
	return json(await saveNamecardVariant(locals.db, await request.json(), params.id));
};
