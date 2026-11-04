import { activeEmptyCard } from '$lib/server/empty-card';
import { activeHoverCard } from '$lib/server/hover-card';
import { activeSpacing } from '$lib/server/spacing';
import { activeTypography } from '$lib/server/typography';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ locals, depends, url }) => {
	depends('app:typography');
	depends('app:spacing');
	depends('app:empty-card');
	depends('app:hover-card');
	// Read on route changes as well as explicit theme activation.
	void url.pathname;
	return {
		emptyCardTheme: await activeEmptyCard(locals.db),
		hoverCardTheme: await activeHoverCard(locals.db),
		spacingTheme: await activeSpacing(locals.db),
		typographyTheme: await activeTypography(locals.db)
	};
};
