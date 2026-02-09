<script lang="ts">
	import type { ImageV1Data } from './validator';
	import { getImageSources, getResponsiveSrcset } from '$lib/utils/image-formats';

	type Props = {
		data: ImageV1Data;
		className?: string;
		eager?: boolean;
		aspectRatio?: number;
	};

	let { data, className = '', eager = false, aspectRatio }: Props = $props();

	const hasPosition = $derived(
		data.positionX !== undefined || data.positionY !== undefined || data.zoom !== undefined
	);

	const imgSrcset = $derived(getResponsiveSrcset(data.imageUrl));
</script>

<figure class={`space-y-3 ${className}`}>
	<div class="relative overflow-hidden rounded-[0.35rem]">
		{#if data.imageFormats?.length}
			<picture>
				{#each getImageSources(data.imageUrl, data.imageFormats, '(max-width: 767px) 100vw, calc(100vw - 320px)') as source (source.type)}
					<source srcset={source.srcset} type={source.type} sizes={source.sizes} />
				{/each}
				<img
					src={data.imageUrl}
					alt={data.description ?? ''}
					loading={eager ? 'eager' : 'lazy'}
					fetchpriority={eager ? 'high' : undefined}
					class="w-full max-h-[70vh] object-cover"
					srcset={imgSrcset}
					sizes={imgSrcset ? '(max-width: 767px) 100vw, calc(100vw - 320px)' : undefined}
					style:object-position={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
					style:transform={hasPosition && data.zoom && data.zoom !== 1 ? `scale(${data.zoom})` : undefined}
					style:transform-origin={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
				/>
			</picture>
		{:else}
			<img
				src={data.imageUrl}
				alt={data.description ?? ''}
				loading={eager ? 'eager' : 'lazy'}
				fetchpriority={eager ? 'high' : undefined}
				class="w-full max-h-[70vh] object-cover"
				srcset={imgSrcset}
				sizes={imgSrcset ? '(max-width: 767px) 100vw, calc(100vw - 320px)' : undefined}
				style:object-position={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
				style:transform={hasPosition && data.zoom && data.zoom !== 1 ? `scale(${data.zoom})` : undefined}
				style:transform-origin={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
			/>
		{/if}
		<div class="absolute inset-0 pointer-events-none rounded-[0.35rem]" style="box-shadow: inset 0 0 12px rgba(0,0,0,0.15);"></div>
	</div>
	{#if data.description}
		<figcaption class="text-xs text-ash">{data.description}</figcaption>
	{/if}
</figure>
