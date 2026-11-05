<script lang="ts">
	import { getImageSources, getResponsiveSrcset } from '$lib/utils/image-formats';
	import { effectStyles, fillBackground, type EmptyCardEffects, type EmptyCardFill } from './index';
	let {
		fill,
		effects,
		sizes
	}: { fill: EmptyCardFill; effects?: EmptyCardEffects; sizes: string } = $props();
	const styles = $derived(effectStyles(fill.type === 'blank' ? undefined : effects));
</script>

<div class="absolute inset-0 overflow-hidden" style:opacity={styles.opacity} style:mask-image={styles.mask}>
	{#if fill.type === 'image' && !fill.imageUrl}
		<!-- A draft that hasn't uploaded its image yet. -->
	{:else if fill.type === 'image'}
		{@const srcset = getResponsiveSrcset(fill.imageUrl)}
		<picture class="absolute inset-0" style:inset={styles.inset}>
			{#each getImageSources(fill.imageUrl, fill.imageFormats, sizes) as source (source.type)}
				<source srcset={source.srcset} type={source.type} sizes={source.sizes} />
			{/each}
			<img
				src={fill.imageUrl}
				alt=""
				class="h-full w-full object-cover"
				style:object-position="{fill.positionX}% {fill.positionY}%"
				style:filter={styles.filter}
				{srcset}
				sizes={srcset ? sizes : undefined}
				loading="lazy"
			/>
		</picture>
	{:else}
		<div
			class={['absolute inset-0', { 'empty-card-blank': fill.type === 'blank' }]}
			style:inset={styles.inset}
			style:filter={styles.filter}
			style:background={fillBackground(fill)}
		></div>
	{/if}
	{#if styles.washOpacity}
		<div class="absolute inset-0 bg-white" style:opacity={styles.washOpacity}></div>
	{/if}
</div>

<style>
	.empty-card-blank {
		border: 1px solid rgba(255, 255, 255, 0.08);
	}
</style>
