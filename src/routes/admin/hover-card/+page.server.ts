import { error, redirect } from '@sveltejs/kit';
import { listHoverCard } from '$lib/server/hover-card';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.auth().userId) throw redirect(307, '/');
	if (!locals.db) throw error(500, 'Database unavailable');
	return { hoverCard: await listHoverCard(locals.db) };
};
