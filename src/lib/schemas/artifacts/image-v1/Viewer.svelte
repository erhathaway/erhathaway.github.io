<script lang="ts">
	import type { ImageV1Data } from './validator';
	import { getImageSources } from '$lib/utils/image-formats';

	type Props = {
		data: ImageV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();

	const hasPosition = $derived(
		data.positionX !== undefined || data.positionY !== undefined || data.zoom !== undefined
	);
</script>

<figure class={`space-y-3 ${className}`}>
	<div class="overflow-hidden rounded-lg">
		{#if data.imageFormats?.length}
			<picture>
				{#each getImageSources(data.imageUrl, data.imageFormats) as source (source.type)}
					<source srcset={source.srcset} type={source.type} />
				{/each}
				<img
					src={data.imageUrl}
					alt={data.description ?? ''}
					loading="lazy"
					class="w-full object-cover"
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
