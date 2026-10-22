<script lang="ts">
	import { onMount } from 'svelte';
	import Editor from '$lib/schemas/artifacts/image-v1/Editor.svelte';
	import type { ImageV1Data } from '$lib/schemas/artifacts/image-v1/validator';
	import type {
		NamecardImageSetting,
		NamecardVariant,
		NamecardRecipe,
		NamecardBackground
	} from '$lib/types/site-settings';
	import NamecardCreator from './NamecardCreator.svelte';
	import { fetchNamecardAdmin } from '$lib/utils/namecard-request';
	import type { NamecardDesign } from '$lib/utils/namecard';

	type Props = {
		getToken: () => Promise<string | null>;
		apiPath?: string;
		title?: string;
		subtitle?: string;
	};

	let {
		getToken,
		apiPath = 'namecard-image',
		title = 'Namecard Image',
		subtitle = 'Optional image for the gallery namecard tile'
	}: Props = $props();

	let setting = $state<NamecardImageSetting | null>(null);
	let otherSetting = $state<NamecardImageSetting | null>(null);
	const otherTarget = $derived(target === 'landing' ? 'project' : 'landing');
	let variants = $state<NamecardVariant[]>([]);
	let variantName = $state('');
	let removingVariantId = $state<string | null>(null);
	let draftRecipe = $state<NamecardRecipe | null>(null);
	let creator = $state<{ edit: (recipe: NamecardRecipe) => Promise<boolean> }>();
	let restoring = $state(false);
	let loadError = $state('');
	const target = $derived(apiPath === 'project-namecard-image' ? 'project' : 'landing');
	let loading = $state(true);
	let saving = $state(false);
	let generating = $state(false);
	let uploading = $state(false);
	const busy = $derived(saving || generating || uploading || restoring);
	let statusMessage = $state('');
	let statusType = $state<'success' | 'error'>('success');
	let googlePhotosConnected = $state(false);

	let editorValue = $state<{ imageUrl: string; description?: string; imageFormats?: string[] }>({
		imageUrl: '',
		description: ''
	});
	let positionX = $state(50);
	let positionY = $state(50);
	let zoom = $state(1);

	const hasImage = $derived(!!editorValue.imageUrl);
	function matchesSetting(variant: NamecardVariant, active: NamecardImageSetting | null) {
		return (
			active?.imageUrl === variant.imageUrl &&
			active.positionX === variant.positionX &&
			active.positionY === variant.positionY &&
			active.zoom === variant.zoom
		);
	}

	function isActive(variant: NamecardVariant) {
		return matchesSetting(variant, setting);
	}

	async function request(path: string, method = 'GET', body?: unknown) {
		const response = await fetchNamecardAdmin(getToken, path, {
			method,
			headers: {
				...(body ? { 'Content-Type': 'application/json' } : {})
			},
			...(body ? { body: JSON.stringify(body) } : {})
		});
		if (!response.ok) {
			const data = await response.json().catch(() => null);
			throw new Error(data?.message ?? 'Could not update name cards. Please try again.');
		}
		return response.json();
	}

	function loadDraft(card: NamecardImageSetting & { recipe?: NamecardRecipe }) {
		draftRecipe = card.recipe ? structuredClone($state.snapshot(card.recipe)) : null;
		editorValue = { imageUrl: card.imageUrl, description: '', imageFormats: card.imageFormats };
		positionX = card.positionX;
		positionY = card.positionY;
		zoom = card.zoom;
	}

	function useVariant(variant: NamecardVariant) {
		loadDraft(variant);
		variantName = `${variant.name} copy`.slice(0, 100);
		statusType = 'success';
		statusMessage =
			'Variant loaded into the editor. Adjust its framing and save it as a new variant.';
	}

	async function fetchSetting() {
		loading = true;
		loadError = '';
		try {
			const [active, savedVariants, otherActive] = await Promise.all([
				request(`/api/admin/site-settings/${apiPath}`),
				request('/api/admin/namecards/variants'),
				request(
					`/api/admin/site-settings/${target === 'landing' ? 'project-namecard-image' : 'namecard-image'}`
				)
			]);
			setting = active as NamecardImageSetting | null;
			otherSetting = otherActive as NamecardImageSetting | null;
			variants = savedVariants as NamecardVariant[];
			if (setting) loadDraft(variants.find(isActive) ?? setting);
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Could not load name cards.';
		} finally {
			loading = false;
		}
	}

	async function fetchGooglePhotosStatus() {
		try {
			const response = await fetchNamecardAdmin(
				getToken,
				'/api/admin/integrations/google-photos/status'
			);
			if (response.ok) {
				const data = await response.json();
				googlePhotosConnected = data.connected;
			}
		} catch {
			// Non-critical
		}
	}

	async function handleUpload(file: File): Promise<string | { url: string; formats?: string[] }> {
		const formData = new FormData();
		formData.append('file', file);
		const response = await fetchNamecardAdmin(getToken, '/api/admin/uploads/artifacts', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) throw new Error('Upload failed.');

		const payload = (await response.json()) as { url?: string; formats?: string[] };
		if (!payload.url) throw new Error('No URL returned from upload.');
		if (payload.formats?.length) {
			return { url: payload.url, formats: payload.formats };
		}
		return payload.url;
	}

	function handleEditorChange(next: ImageV1Data) {
		if (next.imageUrl !== editorValue.imageUrl) draftRecipe = null;
		editorValue = {
			...next,
			imageFormats:
				next.imageFormats ??
				(next.imageUrl === editorValue.imageUrl ? editorValue.imageFormats : undefined)
		};
		positionX = next.positionX ?? 50;
		positionY = next.positionY ?? 50;
		zoom = next.zoom ?? 1;
	}

	async function handleGeneratedCard(
		file: File,
		design: NamecardDesign,
		source: File | NamecardBackground | null
	): Promise<NamecardRecipe> {
		generating = true;
		statusMessage = '';
		try {
			let background: NamecardBackground | null = null;
			if (source instanceof File) {
				const uploaded = await handleUpload(source);
				background =
					typeof uploaded === 'string'
						? { imageUrl: uploaded }
						: { imageUrl: uploaded.url, imageFormats: uploaded.formats };
			} else if (source) {
				background = { ...source };
			}
			const recipe: NamecardRecipe = { version: 1, design: { ...design }, background };
			const result = await handleUpload(file);
			editorValue =
				typeof result === 'string'
					? { imageUrl: result, description: '' }
					: { imageUrl: result.url, description: '', imageFormats: result.formats };
			if (!draftRecipe) {
				positionX = 50;
				positionY = 50;
				zoom = 1;
			}
			draftRecipe = recipe;
			return recipe;
		} finally {
			generating = false;
		}
	}

	async function editDraft() {
		if (!draftRecipe || !creator || busy) return;
		restoring = true;
		statusMessage = '';
		try {
			const restored = await creator.edit(structuredClone($state.snapshot(draftRecipe)));
			statusType = restored ? 'success' : 'error';
			statusMessage = restored
				? 'Draft restored in the generator. Make your changes and generate it again; its cover framing will be kept.'
				: 'Could not restore the background. Your draft is unchanged; try again.';
		} finally {
			restoring = false;
		}
	}

	async function handleSave() {
		if (!hasImage || busy) return;
		saving = true;
		statusMessage = '';
		try {
			const variant = (await request('/api/admin/namecards/variants', 'POST', {
				name: variantName.trim(),
				imageUrl: editorValue.imageUrl,
				positionX,
				positionY,
				zoom,
				imageFormats: editorValue.imageFormats,
				recipe: draftRecipe
			})) as NamecardVariant;
			variants = [variant, ...variants];
			statusType = 'success';
			statusMessage = `Saved “${variant.name}”. Promote it below to use it on the ${target} page.`;
		} catch (err) {
			statusType = 'error';
			statusMessage = err instanceof Error ? err.message : 'Could not save the variant.';
		} finally {
			saving = false;
		}
	}

	async function promote(variant: NamecardVariant) {
		if (busy) return;
		saving = true;
		statusMessage = '';
		try {
			setting = (await request(`/api/admin/namecards/variants/${variant.id}/promote`, 'POST', {
				target
			})) as NamecardImageSetting;
			statusType = 'success';
			statusMessage = `“${variant.name}” is now active on the ${target} page.`;
		} catch (err) {
			statusType = 'error';
			statusMessage = err instanceof Error ? err.message : 'Could not promote the variant.';
		} finally {
			saving = false;
		}
	}

	async function removeVariant(variant: NamecardVariant) {
		if (busy) return;
		saving = true;
		statusMessage = '';
		try {
			await request(`/api/admin/namecards/variants/${variant.id}`, 'DELETE');
			variants = variants.filter((item) => item.id !== variant.id);
			removingVariantId = null;
			statusType = 'success';
			statusMessage = `Removed “${variant.name}” from saved variants.`;
		} catch (err) {
			statusType = 'error';
			statusMessage = err instanceof Error ? err.message : 'Could not remove the variant.';
		} finally {
			saving = false;
		}
	}

	async function handleRemove() {
		saving = true;
		statusMessage = '';
		try {
			await request(`/api/admin/site-settings/${apiPath}`, 'DELETE');
			setting = null;
			statusType = 'success';
			statusMessage = 'Active name card removed. Your saved variants are still available.';
		} catch (err) {
			statusType = 'error';
			statusMessage = err instanceof Error ? err.message : 'Could not remove the active card.';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void Promise.all([fetchSetting(), fetchGooglePhotosStatus()]);
	});
</script>

<section class="mt-10 border-t border-slate-200 pt-8">
	<div class="mb-5 flex items-center justify-between">
		<div>
			<h2 class="text-sm font-semibold text-slate-900">{title}</h2>
			<p class="mt-0.5 text-xs text-slate-500">{subtitle}</p>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center gap-2 py-6">
			<div
				class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"
			></div>
			<span class="text-xs text-slate-500">Loading...</span>
		</div>
	{:else if loadError}
		<p class="text-sm text-red-600" role="alert">{loadError}</p>
		<button type="button" onclick={fetchSetting} class="mt-3 text-sm underline">Try again</button>
	{:else}
		<NamecardCreator
			bind:this={creator}
			{getToken}
			onGenerate={handleGeneratedCard}
			disabled={saving || uploading || restoring}
		/>
		<div class="mt-8 mb-3 flex flex-wrap items-center gap-3">
			<h3 class="text-sm font-semibold text-slate-900">Save a name card variant</h3>
			{#if draftRecipe}<button
					type="button"
					disabled={busy}
					onclick={editDraft}
					class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
					>{restoring ? 'Restoring…' : 'Edit in generator'}</button
				>{/if}
		</div>
		{#if hasImage && !draftRecipe}<p class="mb-4 text-xs text-slate-500">
				This image has no saved generator settings. You can adjust its cover framing or create a new
				card above.
			</p>{/if}
		<fieldset disabled={saving || generating || restoring} class="grid max-w-md min-w-0 gap-5">
			<legend class="sr-only">Name card image settings</legend>
			<label class="grid gap-2 text-xs font-semibold text-slate-600"
				>Variant name (optional)
				<input
					bind:value={variantName}
					maxlength="100"
					placeholder="Leave blank to generate a name"
					class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
				/>
			</label>
			<Editor
				value={{ ...editorValue, positionX, positionY, zoom }}
				onChange={handleEditorChange}
				onUpload={handleUpload}
				onUploadStateChange={(state) => (uploading = state.uploading)}
				{googlePhotosConnected}
			/>

			<div class="flex items-center gap-2.5">
				<button
					type="button"
					disabled={!hasImage || busy}
					onclick={handleSave}
					class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
				>
					{saving ? 'Saving...' : 'Save variant'}
				</button>
			</div>
			<p class="text-xs text-slate-500">
				Saving keeps this image and framing as a variant. Promote a saved variant below to make it
				active.
			</p>
		</fieldset>
		{#if statusMessage}
			<p
				role={statusType === 'error' ? 'alert' : 'status'}
				class="mt-4 text-sm {statusType === 'error' ? 'text-red-600' : 'text-emerald-700'}"
			>
				{statusMessage}
			</p>
		{/if}
		<section class="mt-10 border-t border-slate-200 pt-6" aria-label="Saved name card variants">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 class="text-sm font-semibold text-slate-900">Saved variants</h3>
					<p class="mt-1 text-xs text-slate-500">
						Shared between landing and project pages. Promote a variant to use it on this {target} page.
					</p>
				</div>
				{#if setting}<button
						type="button"
						disabled={busy}
						onclick={handleRemove}
						class="text-xs text-red-600 hover:underline disabled:opacity-40"
						>Remove active card</button
					>{/if}
			</div>
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each variants as variant (variant.id)}
					<article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
						<div class="aspect-square overflow-hidden bg-slate-100">
							<img
								src={variant.imageUrl}
								alt={variant.name}
								loading="lazy"
								class="h-full w-full object-cover"
								style:object-position="{variant.positionX}% {variant.positionY}%"
								style:transform="scale({variant.zoom})"
								style:transform-origin="{variant.positionX}% {variant.positionY}%"
							/>
						</div>
						<div class="space-y-3 p-4">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<h4 class="text-sm font-semibold break-words text-slate-800">{variant.name}</h4>
								{#if isActive(variant)}<span
										class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700"
										>Promoted: {target === 'landing' ? 'Landing page' : 'Project pages'}</span
									>{/if}
								{#if matchesSetting(variant, otherSetting)}
									<span
										class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700"
										>Promoted: {otherTarget === 'landing' ? 'Landing page' : 'Project pages'}</span
									>
								{/if}
							</div>
							<div class="flex flex-wrap gap-2">
								<button
									type="button"
									disabled={busy || isActive(variant)}
									onclick={() => promote(variant)}
									class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
									>Promote to {target}</button
								>
								<button
									type="button"
									disabled={busy}
									onclick={() => useVariant(variant)}
									class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 disabled:opacity-40"
									>Use as draft</button
								>
							</div>
							{#if removingVariantId === variant.id}
								<div class="rounded-lg bg-red-50 p-3 text-xs text-red-800">
									<p>Remove “{variant.name}” from saved variants?</p>
									{#if isActive(variant) || matchesSetting(variant, otherSetting)}<p class="mt-1">
											The promoted name card will remain in use.
										</p>{/if}
									<div class="mt-3 flex gap-3">
										<button
											type="button"
											disabled={busy}
											onclick={() => removeVariant(variant)}
											class="font-semibold underline disabled:opacity-40">Confirm removal</button
										>
										<button
											type="button"
											disabled={busy}
											onclick={() => (removingVariantId = null)}
											class="text-slate-600 disabled:opacity-40">Cancel</button
										>
									</div>
								</div>
							{:else}
								<button
									type="button"
									disabled={busy}
									onclick={() => (removingVariantId = variant.id)}
									class="text-xs text-red-600 hover:underline disabled:opacity-40"
									>Remove variant</button
								>
							{/if}
						</div>
					</article>
				{:else}<p class="text-sm text-slate-500">
						No saved variants yet. Create or upload a name card, adjust its framing, and save it
						above.
					</p>{/each}
			</div>
		</section>
	{/if}
</section>
