import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { siteSettings } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.db) throw error(500, 'Database not available');
	const [row] = await locals.db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.key, 'preview_namecard_image'));
	return json(row?.value ?? null);
};
export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.db) throw error(500, 'Database not available');
	await locals.db.delete(siteSettings).where(eq(siteSettings.key, 'preview_namecard_image'));
	return json({ ok: true });
};
