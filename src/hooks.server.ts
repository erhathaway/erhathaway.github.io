import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { withClerkHandler } from 'svelte-clerk/server';
import { getDb } from '$lib/server/db';

const clerkHandle = withClerkHandler();

const dbHandle: Handle = async ({ event, resolve }) => {
	const db = event.platform?.env?.DB;
	if (db) {
		event.locals.db = getDb(db);
	}
	return resolve(event);
};

export const handle = sequence(clerkHandle, dbHandle);
