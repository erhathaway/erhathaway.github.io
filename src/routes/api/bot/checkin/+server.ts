import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { botCheckins } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

const MAX_FIELD_LENGTH = 10_000;
const DAILY_LIMIT = 100;

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) throw error(500, 'Database not available');
	return db;
};

function sanitize(value: string): string {
	// Strip control characters except newlines and tabs
	return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, MAX_FIELD_LENGTH);
}

async function hashUserAgent(ua: string): Promise<string> {
	const encoded = new TextEncoder().encode(ua);
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const db = getDbOrThrow(locals.db);

	// Parse body - support both form-encoded and JSON
	let fields: Record<string, string>;
	const contentType = request.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		const body = await request.json();
		fields = Object.fromEntries(
			Object.entries(body).map(([k, v]) => [k, String(v ?? '')])
		);
	} else {
		const formData = await request.formData();
		fields = Object.fromEntries(
			Array.from(formData.entries()).map(([k, v]) => [k, String(v)])
		);
	}

	const mission = sanitize(fields.mission ?? '').trim();
	if (!mission) {
		throw error(400, 'mission field is required');
	}

	const purpose = sanitize(fields.purpose ?? '').trim();
	const owner = sanitize(fields.owner ?? '').trim();
	const details = sanitize(fields.details ?? '').trim();

	// Rate limit: count today's check-ins
	const [countRow] = await db
		.select({ count: sql<number>`count(*)` })
		.from(botCheckins)
		.where(sql`${botCheckins.createdAt} >= date('now')`);

	if (countRow.count >= DAILY_LIMIT) {
		return json(
			{ error: 'Daily check-in limit reached. Please try again tomorrow.' },
			{ status: 429 }
		);
	}

	const userAgent = request.headers.get('user-agent') ?? 'unknown';
	const identifier = await hashUserAgent(userAgent);
	const ipAddress = request.headers.get('cf-connecting-ip') ??
		request.headers.get('x-forwarded-for') ?? null;

	const payload = JSON.stringify({ mission, purpose, owner, details });

	await db.insert(botCheckins).values({
		identifier,
		userAgent,
		payload,
		ipAddress
	});

	return json({
		message: 'Check-in recorded. Welcome!',
		identifier,
		messagesUrl: `/api/bot/messages/${identifier}`
	}, { status: 201 });
};
