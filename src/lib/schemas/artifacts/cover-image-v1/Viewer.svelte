<script lang="ts">
	import type { CoverImageV1Data } from './validator';
	import { page } from '$app/state';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { getImageSources, getResponsiveSrcset } from '$lib/utils/image-formats';

	type Props = {
		data: CoverImageV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();

	const item = $derived(portfolio.allItems.find(i => i.slug === page.params.slug));
	const useHighlight = $derived(data.source !== 'normal');
	const coverSrc = $derived(
		useHighlight
			? (item?.hoverImage || item?.image)
			: item?.image
	);
	const coverFormats = $derived(
		useHighlight && item?.hoverImage
			? item?.hoverImageFormats
			: item?.imageFormats
	);
	const coverSrcset = $derived(coverSrc ? getResponsiveSrcset(coverSrc) : undefined);
	const pos = $derived(item?.coverPosition);
</script>

{#if item && coverSrc}
	<div class={`w-full md:w-1/2 mx-auto my-16 aspect-square overflow-hidden rounded-lg ${className}`}>
		{#if coverFormats?.length}
			<picture>
				{#each getImageSources(coverSrc, coverFormats, '(max-width: 767px) 100vw, calc(100vw - 320px)') as source (source.type)}
					<source srcset={source.srcset} type={source.type} sizes={source.sizes} />
				{/each}
				<img
					src={coverSrc}
					alt={item.name}
					class="w-full h-full object-cover"
					srcset={coverSrcset}
					sizes={coverSrcset ? '(max-width: 767px) 100vw, calc(100vw - 320px)' : undefined}
					style:object-position="{pos?.x ?? 50}% {pos?.y ?? 50}%"
					style:transform={pos?.zoom && pos.zoom !== 1 ? `scale(${pos.zoom})` : undefined}
					style:transform-origin="{pos?.x ?? 50}% {pos?.y ?? 50}%"
					loading="lazy"
				/>
			</picture>
		{:else}
			<img
				src={coverSrc}
				alt={item.name}
				class="w-full h-full object-cover"
				srcset={coverSrcset}
				sizes={coverSrcset ? '(max-width: 767px) 100vw, calc(100vw - 320px)' : undefined}
				style:object-position="{pos?.x ?? 50}% {pos?.y ?? 50}%"
				style:transform={pos?.zoom && pos.zoom !== 1 ? `scale(${pos.zoom})` : undefined}
				style:transform-origin="{pos?.x ?? 50}% {pos?.y ?? 50}%"
				loading="lazy"
			/>
		{/if}
	</div>
{/if}
