import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { withClerkHandler } from 'svelte-clerk/server';
import { getDb } from '$lib/server/db';
import { verifyClerkAuth } from '$lib/server/auth';

const clerkHandle = withClerkHandler();

const dbHandle: Handle = async ({ event, resolve }) => {
	const db = event.platform?.env?.DB;
	if (db) {
		event.locals.db = getDb(db);
	}
	return resolve(event);
};

const adminAuthHandle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/admin/')) {
		const userId = await verifyClerkAuth(event.request, event.platform?.env);
		const authUserId = event.locals.auth?.()?.userId ?? null;
		if (!userId && !authUserId) {
			throw error(401, 'Unauthorized');
		}
	}
	return resolve(event);
};

export const handle = sequence(clerkHandle, dbHandle, adminAuthHandle);
