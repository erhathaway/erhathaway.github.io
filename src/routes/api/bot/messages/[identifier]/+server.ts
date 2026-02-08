import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { botMessages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const getDbOrThrow = (db: App.Locals['db']) => {
	if (!db) throw error(500, 'Database not available');
	return db;
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
		.orderBy(botMessages.createdAt);

	// Mark unread messages as read
	const unreadIds = messages.filter((m) => !m.isRead).map((m) => m.id);
	if (unreadIds.length > 0) {
		for (const id of unreadIds) {
			await db
				.update(botMessages)
				.set({ isRead: true })
				.where(eq(botMessages.id, id));
		}
	}

	return json({
		identifier,
		messages: messages.map((m) => ({
			id: m.id,
			message: m.message,
			createdAt: m.createdAt
		}))
	});
};
