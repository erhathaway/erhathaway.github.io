import { page } from '$app/state';
import { portfolio } from '$lib/stores/portfolio.svelte';
import { getResponsiveSrcset } from '$lib/utils/image-formats';
import { DEFAULT_THEME, type EmptyCardTheme } from './index';
import { getEmptyCardPreview } from './preview';
import { softTintFromImage } from './tint';

/** The empty card theme for project pages, and a tint matching the current project's image. */
export function useProjectBackground() {
	const preview = getEmptyCardPreview();
	const theme = $derived(
		(preview.enabled && preview.draft) ||
			((page.data.emptyCardTheme as EmptyCardTheme | undefined) ?? DEFAULT_THEME)
	);
	const item = $derived(portfolio.allItems.find((i) => i.slug === page.params?.slug));
	const cover = $derived(item?.hoverImage || item?.image);
	let tint = $state<string | null>(null);

	// The tint comes from loading an image, so it can't be a $derived.
	$effect(() => {
		if (!cover) {
			tint = null;
			return;
		}
		// Only a small copy is needed. Without image resizing, this falls back to the original.
		const sample = getResponsiveSrcset(cover)?.split(' ')[0] ?? cover;
		let current = true;
		void softTintFromImage(sample).then((next) => {
			if (current) tint = next;
		});
		return () => {
			current = false;
		};
	});

	return {
		get theme() {
			return theme;
		},
		get tint() {
			return tint;
		}
	};
}
