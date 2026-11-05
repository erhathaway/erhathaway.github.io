import { activeEmptyCard } from '$lib/server/empty-card';
import { activeHoverCard } from '$lib/server/hover-card';
import { projectNamecardBackground } from '$lib/server/project-namecard';
import { activeSpacing } from '$lib/server/spacing';
import { activeTypography } from '$lib/server/typography';
import { buildClerkProps } from 'svelte-clerk/server';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ locals, depends, url }) => {
	depends('app:typography');
	depends('app:spacing');
	depends('app:empty-card');
	depends('app:hover-card');
	depends('app:project-namecard');
	// Read on route changes as well as explicit theme activation.
	void url.pathname;
	// Independent lookups, so they run together rather than one after another.
	const [emptyCardTheme, hoverCardTheme, projectNamecardBackgroundValue, spacingTheme, typographyTheme] =
		await Promise.all([
			activeEmptyCard(locals.db),
			activeHoverCard(locals.db),
			projectNamecardBackground(locals.db),
			activeSpacing(locals.db),
			activeTypography(locals.db)
		]);
	return {
		// Lets every page know whether the visitor is signed in before Clerk's script loads.
		...buildClerkProps(locals.auth()),
		emptyCardTheme,
		hoverCardTheme,
		projectNamecardBackground: projectNamecardBackgroundValue,
		spacingTheme,
		typographyTheme
	};
};
