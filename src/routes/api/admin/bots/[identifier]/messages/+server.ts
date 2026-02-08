import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { botMessages } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

const MAX_MESSAGE_LENGTH = 10_000;

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) throw error(500, 'Database not available');
	return db;
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 200, headers: corsHeaders });
};

export const GET: RequestHandler = async ({ params, locals }) => {
	const db = getDbOrThrow(locals.db);
	const { identifier } = params;

	if (!/^[0-9a-f]{16}$/.test(identifier)) {
		throw error(400, 'Invalid identifier format');
	}

	const messages = await db
		.select()
		.from(botMessages)
		.where(eq(botMessages.botIdentifier, identifier))
		.orderBy(desc(botMessages.createdAt));

	return json(messages, { headers: corsHeaders });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const db = getDbOrThrow(locals.db);
	const { identifier } = params;

	if (!/^[0-9a-f]{16}$/.test(identifier)) {
		throw error(400, 'Invalid identifier format');
	}

	const payload = await request.json();
	const message = (typeof payload.message === 'string' ? payload.message : '').trim();

	if (!message) {
		throw error(400, 'message is required');
	}

	if (message.length > MAX_MESSAGE_LENGTH) {
		throw error(400, `message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
	}

	const [created] = await db
		.insert(botMessages)
		.values({
			botIdentifier: identifier,
			message
		})
		.returning();

	return json(created, { status: 201, headers: corsHeaders });
};
