<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import type { NamecardImageSetting } from '$lib/types/site-settings';
	import { NAMECARD_PRESETS, renderNamecardPreview } from '$lib/utils/namecard';

	let {
		cards,
		error
	}: {
		cards: Array<{
			id: string;
			label: string;
			image: NamecardImageSetting | null;
			name: string | null;
		}>;
		error?: string | null;
	} = $props();
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
	const defaults = $derived(
		mounted
			? Promise.all(
					NAMECARD_PRESETS.slice(0, 2).map(async (preset) => ({
						id: preset.id,
						...(await renderNamecardPreview(null, preset.design))
					}))
				)
			: null
	);
</script>

<section class="mb-10" aria-labelledby="namecard-overview-title">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 id="namecard-overview-title" class="text-sm font-semibold text-slate-900">
				Published name cards
			</h2>
			<p class="mt-1 text-xs text-slate-500">Currently used on your site and in shared links.</p>
		</div>
		<a
			href={resolve('/admin/namecards')}
			class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
			>Manage name cards →</a
		>
	</div>
	{#if error}<p role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
	{:else}
		<div class="grid gap-4 sm:grid-cols-3">
			{#each cards as card (card.id)}
				<article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
					<div class="aspect-square overflow-hidden bg-slate-50">
						{#if card.image}
							<img
								src={card.image.imageUrl}
								alt="Current {card.label.toLowerCase()} name card"
								class="h-full w-full object-cover"
								style:object-position="{card.image.positionX}% {card.image.positionY}%"
								style:transform="scale({card.image.zoom})"
								style:transform-origin="{card.image.positionX}% {card.image.positionY}%"
							/>
						{:else if card.id !== 'preview'}
							{#await defaults}<div
									class="flex h-full items-center justify-center text-xs text-slate-400"
								>
									Loading default…
								</div>
							{:then previews}{@const preview = previews?.find(
									(item) => item.id === card.id
								)}{#if preview}<img
										src={preview.url}
										alt="Built-in {card.label.toLowerCase()} name card"
										class="h-full w-full object-cover"
									/>{/if}
							{:catch}<div class="flex h-full items-center justify-center text-xs text-slate-500">
									Built-in default
								</div>{/await}
						{:else}<div
								class="flex h-full flex-col items-center justify-center gap-2 p-6 text-center"
							>
								<span class="text-sm font-medium text-slate-500">No preview image</span>
								<p class="text-xs text-slate-400">
									Promote a variant to use when sharing your site.
								</p>
							</div>{/if}
					</div>
					<div class="space-y-2 p-4">
						<h3 class="text-sm font-semibold text-slate-900">{card.label}</h3>
						<p class="text-xs break-words text-slate-500">
							{card.image
								? (card.name ?? 'Previously promoted image')
								: card.id === 'preview'
									? 'Not configured'
									: 'Built-in default'}
						</p>
						<span
							class="inline-flex rounded-full px-2 py-1 text-[10px] font-medium {card.image
								? 'bg-emerald-50 text-emerald-700'
								: 'bg-slate-100 text-slate-500'}"
							>{card.image
								? 'Promoted'
								: card.id === 'preview'
									? 'No promotion'
									: 'Default in use'}</span
						>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>
