import { error, redirect } from '@sveltejs/kit';
import { listEmptyCard } from '$lib/server/empty-card';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.auth().userId) throw redirect(307, '/');
	if (!locals.db) throw error(500, 'Database unavailable');
	return { emptyCard: await listEmptyCard(locals.db) };
};
