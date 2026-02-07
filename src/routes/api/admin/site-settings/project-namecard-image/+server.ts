import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { siteSettings } from '$lib/server/db/schema';
import type { NamecardImageSetting } from '$lib/types/site-settings';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) throw error(500, 'Database not available');
	return db;
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ locals }) => {
	const db = getDbOrThrow(locals.db);
	const [row] = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.key, 'project_namecard_image'));

	if (!row) {
		return json(null, { headers: corsHeaders });
	}

	return json(row.value, { headers: corsHeaders });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const db = getDbOrThrow(locals.db);
	const body = await request.json();

	const imageUrl = body.imageUrl;
	if (!imageUrl || typeof imageUrl !== 'string') {
		throw error(400, 'imageUrl is required');
	}

	const setting: NamecardImageSetting = {
		imageUrl,
		positionX: typeof body.positionX === 'number' ? body.positionX : 50,
		positionY: typeof body.positionY === 'number' ? body.positionY : 50,
		zoom: typeof body.zoom === 'number' ? body.zoom : 1
	};

	// Upsert: delete then insert
	await db.delete(siteSettings).where(eq(siteSettings.key, 'project_namecard_image'));
	await db.insert(siteSettings).values({
		key: 'project_namecard_image',
		value: setting
	});

	return json(setting, { headers: corsHeaders });
};

export const DELETE: RequestHandler = async ({ locals }) => {
	const db = getDbOrThrow(locals.db);
	await db.delete(siteSettings).where(eq(siteSettings.key, 'project_namecard_image'));
	return json({ ok: true }, { headers: corsHeaders });
};
