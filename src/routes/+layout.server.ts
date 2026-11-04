import { activeSpacing } from '$lib/server/spacing';
import { activeTypography } from '$lib/server/typography';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ locals, depends, url }) => {
	depends('app:typography');
	depends('app:spacing');
	// Read on route changes as well as explicit theme activation.
	void url.pathname;
	return {
		spacingTheme: await activeSpacing(locals.db),
		typographyTheme: await activeTypography(locals.db)
	};
};
