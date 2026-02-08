<script lang="ts">
	import type { ImageV1Data } from './validator';
	import { getImageSources, getResponsiveSrcset } from '$lib/utils/image-formats';

	type Props = {
		data: ImageV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();

	const hasPosition = $derived(
		data.positionX !== undefined || data.positionY !== undefined || data.zoom !== undefined
	);

	const imgSrcset = $derived(getResponsiveSrcset(data.imageUrl));
</script>

<figure class={`space-y-3 ${className}`}>
	<div class="overflow-hidden rounded-lg">
		{#if data.imageFormats?.length}
			<picture>
				{#each getImageSources(data.imageUrl, data.imageFormats, '(max-width: 899px) 100vw, calc(100vw - 320px)') as source (source.type)}
					<source srcset={source.srcset} type={source.type} sizes={source.sizes} />
				{/each}
				<img
					src={data.imageUrl}
					alt={data.description ?? ''}
					loading="lazy"
					class="w-full object-cover"
					srcset={imgSrcset}
					sizes={imgSrcset ? '(max-width: 899px) 100vw, calc(100vw - 320px)' : undefined}
					style:object-position={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
					style:transform={hasPosition && data.zoom && data.zoom !== 1 ? `scale(${data.zoom})` : undefined}
					style:transform-origin={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
				/>
			</picture>
		{:else}
			<img
				src={data.imageUrl}
				alt={data.description ?? ''}
				loading="lazy"
				class="w-full object-cover"
				srcset={imgSrcset}
				sizes={imgSrcset ? '(max-width: 899px) 100vw, calc(100vw - 320px)' : undefined}
				style:object-position={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
				style:transform={hasPosition && data.zoom && data.zoom !== 1 ? `scale(${data.zoom})` : undefined}
				style:transform-origin={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
			/>
		{/if}
	</div>
	{#if data.description}
		<figcaption class="text-xs text-ash">{data.description}</figcaption>
	{/if}
</figure>
