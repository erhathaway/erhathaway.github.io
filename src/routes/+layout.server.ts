import { activeTypography } from '$lib/server/typography';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ locals, depends, url }) => {
	depends('app:typography');
	// Read on route changes as well as explicit theme activation.
	void url.pathname;
	return { typographyTheme: await activeTypography(locals.db) };
};
