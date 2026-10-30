<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { snapshotTypography, type TypographyContext } from '$lib/typography';
	import { renderNamecardPreview, type NamecardDesign } from '$lib/utils/namecard';
	let {
		name,
		context = 'landing',
		design,
		inUse,
		previewOnly = false,
		disabled = false,
		onclick
	}: {
		name: string;
		context?: TypographyContext;
		design: NamecardDesign;
		inUse: boolean;
		previewOnly?: boolean;
		disabled?: boolean;
		onclick: () => void;
	} = $props();
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
	const preview = $derived(
		mounted
			? renderNamecardPreview(null, {
					...design,
					typography: snapshotTypography(page.data.typographyTheme, context)
				})
			: null
	);
</script>

<button type="button" {disabled} {onclick} aria-label="Create a variant from {name}" class="preset">
	<span class="picture">
		{#await preview}<span>Rendering default…</span>
		{:then image}{#if image}<img src={image.url} alt="" />{/if}
		{:catch}<span>Open to customize this default</span>{/await}
	</span>
	<span class="details"
		><strong>{name}</strong><span class="badge">Locked default{inUse ? ' · In use' : ''}</span><span
			>{previewOnly
				? 'Create a preview variant from this default'
				: 'Create your own variant from this default'}</span
		></span
	>
</button>

<style>
	.preset {
		display: flex;
		flex-direction: column;
		text-align: left;
		overflow: hidden;
		border: 1px solid #e2e8f0;
		border-radius: 0.875rem;
		background: white;
		cursor: pointer;
	}
	.preset:hover:enabled {
		border-color: #94a3b8;
		box-shadow: 0 4px 16px #0f172a0a;
	}
	.preset:focus-visible {
		outline: 2px solid #475569;
		outline-offset: 3px;
	}
	.preset:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.picture {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		aspect-ratio: 1;
		background: #f8fafc;
		font-size: 0.75rem;
		color: #64748b;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.details {
		display: flex;
		align-items: flex-start;
		flex-direction: column;
		gap: 0.65rem;
		padding: 1rem;
		font-size: 0.75rem;
		color: #64748b;
	}
	strong {
		font-size: 0.875rem;
		color: #0f172a;
	}
	.badge {
		border-radius: 1rem;
		padding: 0.25rem 0.5rem;
		background: #f1f5f9;
		color: #475569;
		font-size: 0.65rem;
	}
</style>
