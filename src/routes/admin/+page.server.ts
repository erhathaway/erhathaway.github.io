import { redirect } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import { siteSettings } from '$lib/server/db/schema';
import { listNamecardVariants } from '$lib/server/namecard-variants';
import type { NamecardImageSetting } from '$lib/types/site-settings';

export const load = async ({ locals }) => {
	const { userId } = locals.auth();

	if (!userId) {
		throw redirect(307, '/admin/sign-in');
	}

	const destinations = [
		{ id: 'landing', label: 'Landing page', key: 'namecard_image' },
		{ id: 'project', label: 'Project pages', key: 'project_namecard_image' },
		{ id: 'preview', label: 'Preview image', key: 'preview_namecard_image' }
	];
	try {
		if (!locals.db) throw new Error('Database unavailable');
		const [settings, variants] = await Promise.all([
			locals.db
				.select()
				.from(siteSettings)
				.where(
					inArray(
						siteSettings.key,
						destinations.map((destination) => destination.key)
					)
				),
			listNamecardVariants(locals.db)
		]);
		const namecards = destinations.map(({ id, label, key }) => {
			const image = (settings.find((row) => row.key === key)?.value ??
				null) as NamecardImageSetting | null;
			const variant = image
				? variants.find(
						(item) =>
							item.imageUrl === image.imageUrl &&
							item.positionX === image.positionX &&
							item.positionY === image.positionY &&
							item.zoom === image.zoom
					)
				: null;
			return { id, label, image, name: variant?.name ?? null };
		});
		return { userId, namecards, namecardError: null };
	} catch {
		return {
			userId,
			namecards: [],
			namecardError: 'Could not load published name cards. Refresh the page to try again.'
		};
	}
};
