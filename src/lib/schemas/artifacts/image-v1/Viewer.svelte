<script lang="ts">
	import type { ImageV1Data } from './validator';
	import { getImageSources, getResponsiveSrcset } from '$lib/utils/image-formats';

	type Props = {
		data: ImageV1Data;
		className?: string;
		eager?: boolean;
		aspectRatio?: number;
		sizes?: string;
	};

	let {
		data,
		className = '',
		eager = false,
		aspectRatio,
		sizes = '(max-width: 767px) 100vw, calc(100vw - 320px)'
	}: Props = $props();

	// With a known aspect ratio the frame reserves the image's exact space, so nothing shifts when
	// the image arrives; a placeholder shows until it does. The width is explicit because a sized
	// box with only a max-height would otherwise carry that cap over to its width too.
	const sized = $derived(aspectRatio !== undefined && aspectRatio > 0);
	let loaded = $state(false);
	function trackLoaded(img: HTMLImageElement) {
		loaded = img.complete && img.naturalWidth > 0;
		const done = () => { loaded = true; };
		img.addEventListener('load', done);
		img.addEventListener('error', done);
		return () => {
			img.removeEventListener('load', done);
			img.removeEventListener('error', done);
		};
	}

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
	<div
		class={['image-frame relative w-full overflow-hidden rounded-[0.35rem] border border-white/10', { sized, loaded, 'max-h-[70vh]': sized }]}
		style:aspect-ratio={sized ? `1 / ${aspectRatio}` : undefined}
	>
		{#if data.imageFormats?.length}
			<picture>
				{#each getImageSources(data.imageUrl, data.imageFormats, sizes) as source (source.type)}
					<source srcset={source.srcset} type={source.type} sizes={source.sizes} />
				{/each}
				<img
					src={data.imageUrl}
					alt={data.description ?? ''}
					loading={eager ? 'eager' : 'lazy'}
					fetchpriority={eager ? 'high' : undefined}
					class={sized ? 'absolute inset-0 h-full w-full object-cover' : 'w-full max-h-[70vh] object-cover'}
					{@attach trackLoaded}
					srcset={imgSrcset}
					sizes={imgSrcset ? sizes : undefined}
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
				class={sized ? 'absolute inset-0 h-full w-full object-cover' : 'w-full max-h-[70vh] object-cover'}
				{@attach trackLoaded}
				srcset={imgSrcset}
				sizes={imgSrcset ? sizes : undefined}
				style:object-position={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
				style:transform={hasPosition && data.zoom && data.zoom !== 1 ? `scale(${data.zoom})` : undefined}
				style:transform-origin={hasPosition ? `${data.positionX ?? 50}% ${data.positionY ?? 50}%` : undefined}
			/>
		{/if}
		{#if data.innerShadow !== false}
			<div class="image-shade absolute inset-0 pointer-events-none rounded-[0.35rem]" style="box-shadow: inset 0 0 12px rgba(0,0,0,0.15);"></div>
		{/if}
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

<style>
	/* Until the image is in, the frame is a warm placeholder in the section-title frame's palette:
	   the same hairline border, a cream fill, and a slow sweep of light across it. */
	.image-frame.sized:not(.loaded) {
		border-color: rgba(61, 46, 30, 0.14);
		background: rgba(252, 240, 224, 0.5);
	}
	.image-frame.sized:not(.loaded)::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			105deg,
			transparent 30%,
			rgba(255, 250, 240, 0.65) 50%,
			transparent 70%
		);
		transform: translateX(-100%);
		animation: image-sweep 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
		pointer-events: none;
	}
	.image-frame.sized img,
	.image-frame.sized .image-shade {
		transition: opacity 0.4s ease;
	}
	.image-frame.sized:not(.loaded) img,
	.image-frame.sized:not(.loaded) .image-shade {
		opacity: 0;
	}
	@keyframes image-sweep {
		to { transform: translateX(100%); }
	}
	@media (prefers-reduced-motion: reduce) {
		.image-frame.sized:not(.loaded)::after {
			animation: none;
			transform: none;
			background: rgba(255, 250, 240, 0.25);
		}
		.image-frame.sized img,
		.image-frame.sized .image-shade {
			transition: none;
		}
	}
</style>