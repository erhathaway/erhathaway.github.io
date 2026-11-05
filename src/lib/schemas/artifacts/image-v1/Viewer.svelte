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
	// Uploads often leave the original filename as the description, which isn't a comment.
	const comment = $derived.by(() => {
		const text = data.description?.trim();
		return text && !/\.(jpe?g|png|webp|heic|heif|avif|gif|tiff?)$/i.test(text) ? text : undefined;
	});
</script>

<figure class={className}>
	<div class="relative overflow-hidden rounded-[0.35rem] border border-white/10">
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
	{#if comment}
		<!-- Overlaps the photo by a fixed amount, so longer comments grow downward, not over it. -->
		<figcaption
			data-typo="caption"
			class="relative mx-3 -mt-4 w-fit border px-3.5 py-2.5 leading-snug backdrop-blur-md"
			style="background: rgba(250, 243, 230, 0.8); border-color: rgba(61, 46, 30, 0.18); color: #2c2218;"
		>
			{comment}
		</figcaption>
	{/if}
</figure>
