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

<div class={`relative overflow-hidden rounded-2xl ${className}`}>
	{#if data.imageFormats?.length}
		<picture>
			{#each getImageSources(data.imageUrl, data.imageFormats) as source (source.type)}
				<source srcset={source.srcset} type={source.type} />
			{/each}
			<img
				src={data.imageUrl}
				alt={data.description ?? ''}
				loading="lazy"
				class="h-full w-full object-cover"
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
			class="h-full w-full object-cover"
			style:object-position={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
			style:transform={hasPosition && data.zoom && data.zoom !== 1 ? `scale(${data.zoom})` : undefined}
			style:transform-origin={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
		/>
	{/if}
	{#if data.description}
		<div class="absolute bottom-0 left-0 right-0 bg-walnut/70 px-4 py-3 text-xs text-cream">
			{data.description}
		</div>
	{/if}
</div>
