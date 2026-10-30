import { error, redirect } from '@sveltejs/kit';
import { listTypography } from '$lib/server/typography';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.auth().userId) throw redirect(307, '/admin/sign-in');
	if (!locals.db) throw error(500, 'Database unavailable');
	return { typography: await listTypography(locals.db) };
};
