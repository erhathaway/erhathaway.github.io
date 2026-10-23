<script lang="ts">
	import { onMount, tick } from 'svelte';
	import CoverPositionEditor from '$lib/components/CoverPositionEditor.svelte';
	import type {
		NamecardImageSetting,
		NamecardVariant,
		NamecardRecipe,
		NamecardBackground
	} from '$lib/types/site-settings';
	import NamecardCreator from './NamecardCreator.svelte';
	import { fetchNamecardAdmin } from '$lib/utils/namecard-request';
	import { NAMECARD_PRESETS, type NamecardDesign } from '$lib/utils/namecard';
	import NamecardPresetTile from './NamecardPresetTile.svelte';

	let {
		getToken,
		title = 'Name cards'
	}: { getToken: () => Promise<string | null>; title?: string } = $props();
	const destinations = [
		{ id: 'landing', label: 'Landing page', path: 'namecard-image' },
		{ id: 'project', label: 'Project pages', path: 'project-namecard-image' },
		{ id: 'preview', label: 'Preview image', path: 'preview-namecard-image' }
	] as const;
	type Target = (typeof destinations)[number]['id'];
	let active = $state<Record<Target, NamecardImageSetting | null>>({
		landing: null,
		project: null,
		preview: null
	});
	let variants = $state<NamecardVariant[]>([]);
	let variantName = $state('');
	let removingVariantId = $state<string | null>(null);
	let draftRecipe = $state<NamecardRecipe | null>(null);
	let creator = $state<{ edit: (recipe: NamecardRecipe) => Promise<boolean> }>();
	let restoring = $state(false);
	let loadError = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let generating = $state(false);
	let uploading = $state(false);
	const busy = $derived(saving || generating || uploading || restoring);
	let statusMessage = $state('');
	let statusType = $state<'success' | 'error'>('success');
	let editing = $state(false);
	let selectedId = $state<string | null>(null);
	let sourceDefault = $state<string | null>(null);
	let generatorOpen = $state(false);
	let generatorError = $state('');
	let baseline = $state('');
	const selected = $derived(variants.find((variant) => variant.id === selectedId));
	const draftSignature = $derived(
		JSON.stringify({ variantName, editorValue, positionX, positionY, zoom, draftRecipe })
	);
	const dirty = $derived(editing && draftSignature !== baseline);

	function openEditor(variant?: NamecardVariant) {
		selectedId = variant?.id ?? null;
		sourceDefault = null;
		variantName = variant?.name ?? '';
		loadDraft(variant ?? { imageUrl: '', positionX: 50, positionY: 50, zoom: 1 });
		baseline = JSON.stringify({
			variantName,
			editorValue,
			positionX,
			positionY,
			zoom,
			draftRecipe
		});
		editing = true;
		removingVariantId = null;
		statusMessage = '';
	}

	async function openPreset(preset: (typeof NAMECARD_PRESETS)[number]) {
		openEditor();
		sourceDefault = preset.name;
		variantName = `${preset.name} customized`;
		draftRecipe = { version: 1, background: null, design: { ...preset.design } };
		await openGenerator();
	}

	function backToVariants() {
		if (busy || (dirty && !window.confirm('Discard unsaved changes to this variant?'))) return;
		editing = false;
		removingVariantId = null;
	}

	function showDialog(node: HTMLDialogElement) {
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		node.showModal();
		return () => {
			node.close();
			document.body.style.overflow = previousOverflow;
		};
	}

	async function uploadImage(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || busy) return;
		uploading = true;
		statusMessage = '';
		try {
			if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
			const result = await handleUpload(file);
			loadDraft({
				imageUrl: typeof result === 'string' ? result : result.url,
				imageFormats: typeof result === 'string' ? undefined : result.formats,
				positionX: 50,
				positionY: 50,
				zoom: 1
			});
		} catch (err) {
			statusType = 'error';
			statusMessage = err instanceof Error ? err.message : 'Could not upload image.';
		} finally {
			uploading = false;
			input.value = '';
		}
	}

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

	function isActive(variant: NamecardVariant, target: Target) {
		return matchesSetting(variant, active[target]);
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

	async function fetchSetting() {
		loading = true;
		loadError = '';
		try {
			const [savedVariants, ...settings] = await Promise.all([
				request('/api/admin/namecards/variants'),
				...destinations.map((destination) =>
					request(`/api/admin/site-settings/${destination.path}`)
				)
			]);
			variants = savedVariants as NamecardVariant[];
			active = { landing: settings[0], project: settings[1], preview: settings[2] };
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Could not load name cards.';
		} finally {
			loading = false;
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
			generatorOpen = false;
			return recipe;
		} finally {
			generating = false;
		}
	}

	async function openGenerator() {
		if (busy) return;
		generatorError = '';
		generatorOpen = true;
		restoring = true;
		await tick();
		try {
			if (draftRecipe && !(await creator?.edit(structuredClone($state.snapshot(draftRecipe))))) {
				throw new Error('Could not restore the background. Close this window and try again.');
			}
		} catch (err) {
			generatorError = err instanceof Error ? err.message : 'Could not restore this design.';
		} finally {
			restoring = false;
		}
	}

	async function handleSave(asCopy = false) {
		if (!hasImage || busy) return;
		saving = true;
		statusMessage = '';
		try {
			const updating = selectedId && !asCopy;
			const variant = (await request(
				updating ? `/api/admin/namecards/variants/${selectedId}` : '/api/admin/namecards/variants',
				updating ? 'PATCH' : 'POST',
				{
					name: asCopy ? `${variantName.trim()} copy`.slice(0, 100) : variantName.trim(),
					imageUrl: editorValue.imageUrl,
					positionX,
					positionY,
					zoom,
					imageFormats: editorValue.imageFormats,
					recipe: draftRecipe
				}
			)) as NamecardVariant;
			variants =
				selectedId && !asCopy
					? variants.map((item) => (item.id === variant.id ? variant : item))
					: [variant, ...variants];
			openEditor(variant);
			statusType = 'success';
			statusMessage = `${updating ? 'Updated' : 'Created'} “${variant.name}”. Choose where to promote this version below.`;
		} catch (err) {
			statusType = 'error';
			statusMessage = err instanceof Error ? err.message : 'Could not save the variant.';
		} finally {
			saving = false;
		}
	}

	async function promote(variant: NamecardVariant, target: Target) {
		if (busy) return;
		saving = true;
		statusMessage = '';
		try {
			active[target] = (await request(
				`/api/admin/namecards/variants/${variant.id}/promote`,
				'POST',
				{
					target
				}
			)) as NamecardImageSetting;
			statusType = 'success';
			statusMessage = `“${variant.name}” is now promoted to ${destinations.find((item) => item.id === target)?.label.toLowerCase()}.`;
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
			editing = false;
			statusType = 'success';
			statusMessage = `Removed “${variant.name}” from saved variants.`;
		} catch (err) {
			statusType = 'error';
			statusMessage = err instanceof Error ? err.message : 'Could not remove the variant.';
		} finally {
			saving = false;
		}
	}

	async function handleRemove(target: Target) {
		saving = true;
		statusMessage = '';
		try {
			await request(
				`/api/admin/site-settings/${destinations.find((item) => item.id === target)!.path}`,
				'DELETE'
			);
			active[target] = null;
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
		void fetchSetting();
	});
</script>

<section class="namecards">
	<header class="page-heading">
		<div>
			<h2>{title}</h2>
			<p>
				{editing
					? 'Refine the image and framing, then save your variant.'
					: 'Your name card collection. Select a variant to edit, or create something new.'}
			</p>
		</div>
		{#if editing}<button class="secondary" disabled={busy} onclick={backToVariants}
				>← All variants</button
			>{/if}
	</header>

	{#if loading}
		<p class="empty" role="status">Loading name cards…</p>
	{:else if loadError}
		<p class="message error" role="alert">{loadError}</p>
		<button class="secondary" onclick={fetchSetting}>Try again</button>
	{:else}
		{#if statusMessage}<p
				class={['message', { error: statusType === 'error' }]}
				role={statusType === 'error' ? 'alert' : 'status'}
			>
				{statusMessage}
			</p>{/if}
		{#if !editing}
			<div class="collection-bar">
				<span
					>{variants.length} saved {variants.length === 1 ? 'variant' : 'variants'} · Shared across landing
					and project pages · 3 editable defaults</span
				>
				<div class="image-actions">
					{#each destinations as destination (destination.id)}
						{#if active[destination.id]}<button
								class="text-button"
								disabled={busy}
								onclick={() => handleRemove(destination.id)}
								>Remove from {destination.label.toLowerCase()}</button
							>{/if}
					{/each}
				</div>
			</div>
			<div class="variant-grid" aria-label="Name card variants">
				<button class="new-card" disabled={busy} onclick={() => openEditor()}>
					<span class="plus" aria-hidden="true">+</span>
					<strong>New variant</strong>
					<span>Upload an image or generate a design</span>
				</button>
				{#each NAMECARD_PRESETS as preset (preset.id)}
					<NamecardPresetTile
						name={preset.name}
						design={preset.design}
						inUse={preset.id !== 'preview' && !active[preset.id]}
						previewOnly={preset.id === 'preview'}
						disabled={busy}
						onclick={() => openPreset(preset)}
					/>
				{/each}
				{#each variants as variant (variant.id)}
					<button
						class="variant-card"
						disabled={busy}
						onclick={() => openEditor(variant)}
						aria-label="Edit {variant.name}"
					>
						<span class="thumbnail"
							><img
								src={variant.imageUrl}
								alt=""
								loading="lazy"
								style:object-position="{variant.positionX}% {variant.positionY}%"
								style:transform="scale({variant.zoom})"
								style:transform-origin="{variant.positionX}% {variant.positionY}%"
							/></span
						>
						<span class="card-meta"
							><strong>{variant.name}</strong><span class="badges">
								{#each destinations as destination (destination.id)}
									{#if isActive(variant, destination.id)}<span class="badge"
											>Promoted: {destination.label}</span
										>{/if}
								{/each}
								{#if !destinations.some((destination) => isActive(variant, destination.id))}<span
										class="muted">Saved variant</span
									>{/if}
							</span></span
						>
					</button>
				{/each}
			</div>
		{:else}
			<div class="editor-shell">
				<div class="editor-heading">
					<h3>{selected ? selected.name : variantName || 'New variant'}</h3>
					<span class="muted"
						>{dirty ? 'Unsaved changes' : selected ? 'Saved' : 'Start with an image'}</span
					>
				</div>
				<p class="px-6 pt-4 text-xs text-slate-500">
					{#if selected}Editing this saved variant. Save changes updates it in place; Save as copy
						creates a separate variant.
					{:else if sourceDefault}{sourceDefault} is locked. Your changes will be saved as a new custom
						variant.
					{:else}Create a new variant from an uploaded image or generated design.{/if}
				</p>
				<fieldset disabled={busy} inert={busy} class="editor-grid">
					<legend class="sr-only">Name card editor</legend>
					<div class="image-column">
						{#if hasImage}
							<CoverPositionEditor
								imageUrl={editorValue.imageUrl}
								{positionX}
								{positionY}
								{zoom}
								onChange={(x, y, z) => {
									positionX = x;
									positionY = y;
									zoom = z;
								}}
							/>
						{:else}
							<div class="blank-preview">
								<span class="plus" aria-hidden="true">+</span>
								<h4>Create your name card</h4>
								<p>Upload a finished image, or design one with your own text and background.</p>
							</div>
						{/if}
						<div class="image-actions">
							<label class="secondary upload-button"
								>{uploading ? 'Uploading…' : hasImage ? 'Replace image' : 'Upload image'}<input
									type="file"
									accept="image/*"
									aria-label={hasImage ? 'Replace image' : 'Upload image'}
									onchange={uploadImage}
								/></label
							>
							<button class={hasImage ? 'secondary' : 'primary'} onclick={openGenerator}
								>{draftRecipe ? 'Regenerate image' : 'Generate image'}</button
							>
						</div>
						{#if hasImage && !draftRecipe}<p class="hint">
								This image has no saved design settings. Generate a new design to edit its text and
								background.
							</p>{/if}
					</div>
					<div class="details-column">
						<label class="field"
							>Variant name <input
								bind:value={variantName}
								maxlength="100"
								placeholder="Name this variant"
							/><span class="hint">Optional. Leave blank for an automatic name.</span></label
						>
						<div class="publishing">
							<h4>Publication</h4>
							<p>Promote this variant to any combination of destinations.</p>
							{#if selected}
								{#each destinations as destination (destination.id)}
									<div class="publication-row">
										<div>
											<h4>{destination.label}</h4>
											<span class="hint"
												>{isActive(selected, destination.id)
													? 'This variant is promoted'
													: destination.id === 'preview'
														? 'Image shown when sharing the site'
														: 'Choose this variant for this page'}</span
											>
										</div>
										{#if isActive(selected, destination.id)}<button
												class="text-button"
												disabled={dirty}
												aria-label={`Unpromote from ${destination.label}`}
												onclick={() => handleRemove(destination.id)}>Unpromote</button
											>
										{:else}<button
												class="secondary"
												disabled={dirty}
												aria-label={`Promote to ${destination.label}`}
												onclick={() => selected && promote(selected, destination.id)}
												>Promote</button
											>{/if}
									</div>
								{/each}
							{:else}<p class="hint">Save this variant to enable promotion.</p>{/if}
							<p class="hint">
								Save edits before promoting. Published images stay in place until you promote again.
							</p>
						</div>
					</div>
				</fieldset>
				<footer class="editor-footer">
					<div class="image-actions">
						<button
							class="primary"
							disabled={!hasImage || busy || (!dirty && !!selected)}
							onclick={() => handleSave()}
							>{saving
								? 'Saving…'
								: selected
									? 'Save changes'
									: sourceDefault
										? 'Save custom variant'
										: 'Save variant'}</button
						>{#if selected}<button
								class="secondary"
								disabled={!hasImage || busy}
								onclick={() => handleSave(true)}>Save as copy</button
							>{/if}<button class="text-button" disabled={busy} onclick={backToVariants}
							>Cancel</button
						>
					</div>
					{#if selected}<button
							class="text-button danger"
							disabled={busy}
							onclick={() => (removingVariantId = selectedId)}>Remove variant</button
						>{/if}
				</footer>
				{#if selected && removingVariantId === selected.id}
					<div class="remove-confirmation" role="alert">
						<p>
							Remove “{selected.name}” from your collection? Any published image will remain in use.
						</p>
						<div class="image-actions">
							<button
								class="secondary danger"
								disabled={busy}
								onclick={() => selected && removeVariant(selected)}>Confirm removal</button
							><button
								class="text-button"
								disabled={busy}
								onclick={() => (removingVariantId = null)}>Keep variant</button
							>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</section>

{#if generatorOpen}
	<dialog
		class="generator-dialog"
		aria-labelledby="generator-title"
		{@attach showDialog}
		oncancel={(event) => {
			event.preventDefault();
			if (!busy) generatorOpen = false;
		}}
	>
		<div class="modal-heading">
			<div>
				<h2 id="generator-title">{draftRecipe ? 'Regenerate name card' : 'Generate name card'}</h2>
				<p>
					{selected
						? 'Apply the regenerated image, then save changes to update this variant.'
						: sourceDefault
							? 'Customize this locked default to create your own variant.'
							: 'Design your image, then apply it to this variant.'}
				</p>
			</div>
			<button class="secondary" disabled={busy} onclick={() => (generatorOpen = false)}
				>Cancel</button
			>
		</div>
		{#if generatorError}<p class="message error" role="alert">{generatorError}</p>{/if}
		{#if restoring}<p class="message" role="status">Restoring your design…</p>{/if}
		<NamecardCreator
			bind:this={creator}
			{getToken}
			onGenerate={handleGeneratedCard}
			disabled={restoring || !!generatorError}
		/>
	</dialog>
{/if}

<style>
	.namecards {
		margin-top: 2rem;
		color: #0f172a;
	}
	.page-heading,
	.editor-heading,
	.editor-footer,
	.collection-bar,
	.modal-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	h2 {
		font-size: 1.125rem;
		font-weight: 650;
	}
	h3 {
		font-size: 1rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	h4 {
		font-size: 0.875rem;
		font-weight: 600;
	}
	.page-heading p,
	.modal-heading p {
		margin-top: 0.375rem;
		font-size: 0.875rem;
		color: #64748b;
	}
	button,
	.upload-button {
		transition:
			background 0.15s,
			border-color 0.15s,
			box-shadow 0.15s;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	button:focus-visible,
	.upload-button:focus-within {
		outline: 2px solid #475569;
		outline-offset: 3px;
	}
	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.625rem;
		padding: 0.625rem 0.9rem;
		font-size: 0.8125rem;
		font-weight: 550;
	}
	.primary {
		background: #0f172a;
		color: white;
		border: 1px solid #0f172a;
	}
	.primary:hover:enabled {
		background: #334155;
	}
	.secondary {
		border: 1px solid #cbd5e1;
		background: white;
		color: #334155;
	}
	.secondary:hover:enabled,
	.upload-button:hover {
		background: #f8fafc;
	}
	.text-button {
		font-size: 0.8125rem;
		color: #64748b;
	}
	.text-button:hover:enabled {
		text-decoration: underline;
	}
	.danger {
		color: #b91c1c;
	}
	.collection-bar {
		margin: 1.75rem 0 1rem;
		font-size: 0.75rem;
		color: #64748b;
	}
	.variant-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
		gap: 1rem;
	}
	.variant-card {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid #e2e8f0;
		border-radius: 0.875rem;
		background: white;
		text-align: left;
	}
	.variant-card:hover:enabled {
		border-color: #94a3b8;
		box-shadow: 0 4px 16px #0f172a0a;
	}
	.thumbnail {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		overflow: hidden;
		background: #f1f5f9;
	}
	.thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.card-meta {
		display: grid;
		gap: 0.65rem;
		padding: 1rem;
		width: 100%;
	}
	.card-meta strong {
		font-size: 0.875rem;
		overflow-wrap: anywhere;
	}
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
	.badge {
		border-radius: 1rem;
		background: #ecfdf5;
		color: #047857;
		padding: 0.25rem 0.5rem;
		font-size: 0.65rem;
		font-weight: 550;
	}
	.muted,
	.hint {
		color: #64748b;
		font-size: 0.75rem;
		font-weight: 400;
		line-height: 1.6;
	}
	.new-card {
		display: flex;
		min-height: 280px;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem;
		border: 1px dashed #cbd5e1;
		border-radius: 0.875rem;
		background: #f8fafc;
		text-align: center;
	}
	.new-card:hover:enabled {
		border-color: #64748b;
		background: #f1f5f9;
	}
	.new-card strong {
		font-size: 0.875rem;
	}
	.new-card > span:last-child {
		color: #64748b;
		font-size: 0.75rem;
		max-width: 170px;
	}
	.plus {
		font-size: 2rem;
		font-weight: 300;
		color: #94a3b8;
	}
	.editor-shell {
		margin-top: 1.5rem;
		border: 1px solid #e2e8f0;
		border-radius: 1rem;
		background: white;
		overflow: hidden;
	}
	.editor-heading {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #f1f5f9;
	}
	.editor-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
		gap: 2rem;
		padding: 1.5rem;
		min-width: 0;
	}
	.image-column,
	.details-column {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.image-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}
	.upload-button {
		position: relative;
		overflow: hidden;
	}
	.upload-button input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
		width: 100%;
	}
	.blank-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		text-align: center;
		aspect-ratio: 1;
		background: #f8fafc;
		border: 1px dashed #cbd5e1;
		border-radius: 0.75rem;
		padding: 2rem;
	}
	.blank-preview p {
		max-width: 240px;
		color: #64748b;
		font-size: 0.8125rem;
		line-height: 1.6;
	}
	.field {
		display: grid;
		gap: 0.5rem;
		font-size: 0.8125rem;
		font-weight: 550;
	}
	.field input {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 400;
	}
	.publication-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		padding: 0.75rem 0;
		border-bottom: 1px solid #e2e8f0;
	}
	.publishing {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.875rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e2e8f0;
	}
	.publishing > p {
		font-size: 0.8125rem;
		color: #64748b;
		line-height: 1.6;
	}
	.publishing > .hint {
		font-size: 0.75rem;
	}
	.editor-footer {
		border-top: 1px solid #e2e8f0;
		padding: 1.25rem 1.5rem;
		background: #f8fafc;
	}
	.message {
		margin: 1rem 0;
		padding: 0.875rem 1rem;
		border-radius: 0.625rem;
		background: #ecfdf5;
		color: #047857;
		font-size: 0.8125rem;
	}
	.message.error,
	.remove-confirmation {
		color: #991b1b;
		background: #fef2f2;
	}
	.remove-confirmation {
		padding: 1.25rem 1.5rem;
		font-size: 0.8125rem;
	}
	.remove-confirmation .image-actions {
		margin-top: 0.75rem;
	}
	.empty {
		padding: 3rem 0;
		color: #64748b;
		font-size: 0.875rem;
	}
	.generator-dialog {
		margin: auto;
		width: min(1100px, calc(100vw - 2rem));
		max-height: calc(100dvh - 2rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		border: 1px solid #e2e8f0;
		border-radius: 1rem;
		padding: 1.5rem;
		background: white;
		color: #0f172a;
		box-shadow: 0 24px 80px #0003;
	}
	.generator-dialog::backdrop {
		background: #0f172a99;
		backdrop-filter: blur(4px);
	}
	.modal-heading {
		padding-bottom: 1.25rem;
		border-bottom: 1px solid #e2e8f0;
	}
	@media (max-width: 700px) {
		.editor-grid {
			grid-template-columns: 1fr;
			padding: 1rem;
			gap: 1.5rem;
		}
		.editor-heading,
		.editor-footer {
			padding: 1rem;
		}
		.generator-dialog {
			padding: 1rem;
		}
		.variant-grid {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		}
	}
</style>
