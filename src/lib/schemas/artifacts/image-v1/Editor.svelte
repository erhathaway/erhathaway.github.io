<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { validateImageV1 } from './validator';
	import type { ImageV1Data } from './validator';
	import FramingEditor from './FramingEditor.svelte';
	import { measureImage } from '$lib/utils/image-size';

	type UploadResult = string | { url: string; formats?: string[] };

	type Props = {
		value?: ImageV1Data;
		onChange?: (value: ImageV1Data) => void;
		onUpload?: (file: File) => Promise<UploadResult>;
		/** Takes several images at once and saves each as its own artifact. Offered only before an image is chosen. */
		onUploadMany?: (files: File[]) => void;
		onUploadStateChange?: (state: { uploading: boolean; error: string | null }) => void;
		googlePhotosConnected?: boolean;
		onGooglePhotosPick?: () => void;
	};

	let { value, onChange, onUpload, onUploadMany, onUploadStateChange, googlePhotosConnected = false, onGooglePhotosPick }: Props = $props();

	const current = $derived(value ?? { imageUrl: '', description: '' } as ImageV1Data);
	const validation = $derived.by(() => validateImageV1(current));
	const errors = $derived(validation.ok ? [] : validation.errors);
	let previewUrl = $state<string | null>(null);
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let isDragOver = $state(false);
	let step = $state<'idle' | 'pick-source'>('idle');

	// Hover image state
	let hoverFileInput = $state<HTMLInputElement | null>(null);
	let hoverUploading = $state(false);
	let hoverUploadError = $state<string | null>(null);
	let hoverPreviewUrl = $state<string | null>(null);

	const displayUrl = $derived.by(() => {
		if (uploading && previewUrl) return previewUrl;
		if (!current.imageUrl && previewUrl) return previewUrl;
		return current.imageUrl ?? '';
	});

	const hasImage = $derived(!!displayUrl);
	const canUploadMany = $derived(!!onUploadMany && !hasImage);

	const setUploadState = (next: { uploading: boolean; error: string | null }) => {
		uploading = next.uploading;
		uploadError = next.error;
		onUploadStateChange?.(next);
	};

	const updateDescription = (event: Event) => {
		const target = event.currentTarget as HTMLTextAreaElement | null;
		onChange?.({
			...current,
			imageUrl: current.imageUrl?.trim() || '',
			description: (target?.value ?? '').trim() || undefined
		});
	};

	const handlePositionChange = (x: number, y: number, z: number) => {
		onChange?.({
			...current,
			imageUrl: current.imageUrl?.trim() || '',
			description: current.description?.trim() || undefined,
			positionX: x,
			positionY: y,
			zoom: z
		});
	};

	const innerShadow = $derived(current.innerShadow !== false);
	const toggleInnerShadow = () => {
		onChange?.({ ...current, imageUrl: current.imageUrl?.trim() || '', innerShadow: !innerShadow });
	};

	const handleHoverFile = async (file: File) => {
		if (!onUpload) return;
		hoverUploading = true;
		hoverUploadError = null;
		if (hoverPreviewUrl) URL.revokeObjectURL(hoverPreviewUrl);
		hoverPreviewUrl = URL.createObjectURL(file);
		try {
			const result = await onUpload(file);
			const uploadedUrl = typeof result === 'string' ? result : result.url;
			const formats = typeof result === 'object' ? result.formats : undefined;
			onChange?.({
				...current,
				imageUrl: current.imageUrl?.trim() || '',
				description: current.description?.trim() || undefined,
				hoverImageUrl: uploadedUrl,
				...(formats?.length ? { hoverImageFormats: formats } : {})
			});
			await tick();
			hoverUploading = false;
			if (hoverPreviewUrl) { URL.revokeObjectURL(hoverPreviewUrl); hoverPreviewUrl = null; }
		} catch (err) {
			hoverUploadError = err instanceof Error ? err.message : 'Upload failed.';
			hoverUploading = false;
			if (current.hoverImageUrl && hoverPreviewUrl) { URL.revokeObjectURL(hoverPreviewUrl); hoverPreviewUrl = null; }
		}
	};

	const handleHoverFileInput = async (event: Event) => {
		event.stopPropagation();
		const target = event.currentTarget as HTMLInputElement | null;
		const file = target?.files?.[0];
		if (!file) return;
		await handleHoverFile(file);
		if (target) target.value = '';
	};

	const removeHoverImage = () => {
		if (hoverPreviewUrl) { URL.revokeObjectURL(hoverPreviewUrl); hoverPreviewUrl = null; }
		onChange?.({
			...current,
			imageUrl: current.imageUrl?.trim() || '',
			description: current.description?.trim() || undefined,
			hoverImageUrl: undefined
		});
	};

	const hoverDisplayUrl = $derived.by(() => {
		if (hoverUploading && hoverPreviewUrl) return hoverPreviewUrl;
		return current.hoverImageUrl ?? '';
	});

	const clearPreview = () => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
	};

	const handleFile = async (file: File) => {
		if (!onUpload) {
			setUploadState({ uploading: false, error: 'Upload handler not configured.' });
			return;
		}

		setUploadState({ uploading: true, error: null });
		step = 'idle';

		clearPreview();
		const nextPreview = URL.createObjectURL(file);
		previewUrl = nextPreview;

		try {
			const result = await onUpload(file);
			const uploadedUrl = typeof result === 'string' ? result : result.url;
			const formats = typeof result === 'object' ? result.formats : undefined;
			const size = await measureImage(uploadedUrl);
			onChange?.({
				imageUrl: uploadedUrl,
				...(size ?? {}),
				description: current.description?.trim() || undefined,
				positionX: current.positionX,
				positionY: current.positionY,
				zoom: current.zoom,
				hoverImageUrl: current.hoverImageUrl,
				...(formats?.length ? { imageFormats: formats } : {})
			});
			await tick();
			setUploadState({ uploading: false, error: null });
			clearPreview();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Upload failed.';
			setUploadState({ uploading: false, error: message });
			if (current.imageUrl) {
				clearPreview();
			}
		}
	};

	const handleFiles = async (files: File[]) => {
		const images = files.filter((file) => file.type.startsWith('image/'));
		if (images.length === 0) return;
		if (images.length > 1 && canUploadMany) {
			step = 'idle';
			onUploadMany?.(images);
			return;
		}
		await handleFile(images[0]);
	};

	const handleFileInput = async (event: Event) => {
		event.stopPropagation();
		const target = event.currentTarget as HTMLInputElement | null;
		const files = Array.from(target?.files ?? []);
		if (target) target.value = '';
		await handleFiles(files);
	};

	const handleDrop = async (event: DragEvent) => {
		event.preventDefault();
		event.stopPropagation();
		isDragOver = false;
		await handleFiles(Array.from(event.dataTransfer?.files ?? []));
	};

	const handleDragOver = (event: DragEvent) => {
		event.preventDefault();
		event.stopPropagation();
	};

	const triggerFilePicker = () => {
		fileInput?.click();
	};

	// With Google Photos connected there is a choice of source; otherwise go straight to the file picker.
	const chooseSource = () => {
		if (uploading) return;
		if (googlePhotosConnected && onGooglePhotosPick) {
			step = 'pick-source';
		} else {
			triggerFilePicker();
		}
	};

	// Handle paste events when this component is focused or visible
	onMount(() => {
		function onPaste(e: ClipboardEvent) {
			const files: File[] = [];
			for (const item of Array.from(e.clipboardData?.items ?? [])) {
				if (item.kind === 'file' && item.type.startsWith('image/')) {
					const file = item.getAsFile();
					if (file) files.push(file);
				}
			}
			if (files.length === 0) return;
			e.preventDefault();
			void handleFiles(files);
		}
		document.addEventListener('paste', onPaste);
		return () => document.removeEventListener('paste', onPaste);
	});

	onDestroy(() => {
		clearPreview();
		if (hoverPreviewUrl) URL.revokeObjectURL(hoverPreviewUrl);
	});
</script>

{#snippet sourcePicker()}
	<div class="flex flex-col items-center justify-center gap-3 px-4 py-5">
		<div class="flex gap-3">
			<button
				type="button"
				class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-400 hover:shadow-sm transition-all duration-150"
				onclick={() => {
					step = 'idle';
					triggerFilePicker();
				}}
			>
				<svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
				</svg>
				<span class="text-xs font-medium text-slate-600">Upload File</span>
			</button>
			<button
				type="button"
				class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-400 hover:shadow-sm transition-all duration-150"
				onclick={() => {
					step = 'idle';
					onGooglePhotosPick?.();
				}}
			>
				<svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<span class="text-xs font-medium text-slate-600">Google Photos</span>
			</button>
		</div>
		<button
			type="button"
			class="text-[11px] text-slate-400 hover:text-slate-600 transition-colors duration-150"
			onclick={() => (step = 'idle')}
		>
			&larr; Back
		</button>
	</div>
{/snippet}

{#snippet details()}
	<label class="grid gap-1">
		<span class="text-xs font-medium text-slate-500">Description</span>
		<textarea
			rows="2"
			value={current.description ?? ''}
			oninput={updateDescription}
			placeholder="Optional caption..."
			class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150 resize-none"
		></textarea>
	</label>

	<div class="flex items-center gap-2.5">
		<button
			type="button"
			role="switch"
			aria-checked={innerShadow}
			aria-label="Inner shadow"
			onclick={toggleInnerShadow}
			class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${innerShadow ? 'bg-slate-600' : 'bg-slate-200'}`}
		>
			<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${innerShadow ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
		</button>
		<span class="text-xs text-slate-500">{innerShadow ? 'Inner shadow on the photo' : 'No inner shadow'}</span>
	</div>
{/snippet}

<!-- The whole editor takes drops. Once there is an image, the upload zone collapses to a row and the
     framing preview gets the room: beside the fields when the editor is wide, above them when not. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={`@container rounded-xl transition-shadow duration-150 ${isDragOver ? 'ring-2 ring-slate-400 ring-offset-4' : ''}`}
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragenter={() => (isDragOver = true)}
	ondragleave={(event) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) isDragOver = false;
	}}
>
	<input
		type="file"
		accept="image/*"
		multiple={canUploadMany}
		class="sr-only"
		bind:this={fileInput}
		onchange={handleFileInput}
	/>

	{#if !displayUrl}
		<div class="grid gap-3">
			<div class="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-slate-300 overflow-hidden transition-colors duration-150">
				{#if step === 'pick-source'}
					{@render sourcePicker()}
				{:else}
					<div
						class="group cursor-pointer h-48 bg-slate-100 flex flex-col items-center justify-center gap-2 px-4 text-center"
						role="button"
						tabindex="0"
						onclick={chooseSource}
						onkeydown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								chooseSource();
							}
						}}
					>
						<svg class="w-8 h-8 text-slate-300 group-hover:text-slate-400 transition-colors duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
						<p class="text-xs text-slate-400 group-hover:text-slate-500 transition-colors duration-150">Drag from desktop, upload, or paste</p>
						{#if canUploadMany}
							<p class="text-[11px] text-slate-400">Choose several to add them all at once. You can adjust each one afterwards.</p>
						{/if}
					</div>
				{/if}
			</div>
			{#if uploadError}
				<p class="text-xs font-medium text-red-600">{uploadError}</p>
			{/if}
			{@render details()}
		</div>
	{:else}
		<div class="grid gap-3 [--framing-max-h:min(44vh,24rem)] @2xl:grid-cols-[minmax(0,1fr)_17rem] @2xl:grid-rows-[auto_1fr] @2xl:gap-x-5 @2xl:[--framing-max-h:min(54vh,30rem)]">
			<!-- Collapsed upload zone -->
			<div class="grid gap-2 @2xl:col-start-2 @2xl:row-start-1">
				{#if step === 'pick-source'}
					<div class="rounded-xl border border-slate-200 bg-slate-50">
						{@render sourcePicker()}
					</div>
				{:else}
					<div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
						<img src={displayUrl} alt="" class="h-11 w-11 shrink-0 rounded-lg object-cover" />
						<div class="min-w-0 flex-1">
							<p class="text-xs font-medium text-slate-700">{uploading ? 'Uploading...' : 'Image uploaded'}</p>
							{#if current.width && current.height}
								<p class="text-[11px] text-slate-400">{current.width} &times; {current.height}</p>
							{/if}
						</div>
						<button
							type="button"
							disabled={uploading}
							class="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
							onclick={chooseSource}
						>
							Replace
						</button>
					</div>
				{/if}
				{#if uploadError}
					<p class="text-xs font-medium text-red-600">{uploadError}</p>
				{/if}
			</div>

			<div class="@2xl:col-start-1 @2xl:row-start-1 @2xl:row-span-2">
				<FramingEditor
					imageUrl={displayUrl}
					positionX={current.positionX}
					positionY={current.positionY}
					zoom={current.zoom}
					aspect={uploading || !current.width || !current.height ? undefined : current.width / current.height}
					busy={uploading}
					onChange={handlePositionChange}
				/>
			</div>

			<div class="grid content-start gap-3 @2xl:col-start-2 @2xl:row-start-2">
				{@render details()}

				<!-- Hover image (optional) -->
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="text-xs font-medium text-slate-500">Hover image</span>
						{#if hoverDisplayUrl}
							<button
								type="button"
								class="text-[11px] text-slate-400 hover:text-red-500 transition-colors duration-150"
								onclick={removeHoverImage}
							>
								Remove
							</button>
						{/if}
					</div>
					{#if hoverDisplayUrl}
						<div class="relative rounded-lg overflow-hidden border border-slate-200">
							<img
								src={hoverDisplayUrl}
								alt="Hover preview"
								class={['w-full max-h-32 object-cover', hoverUploading && 'opacity-50']}
							/>
							{#if hoverUploading}
								<div class="absolute inset-0 flex items-center justify-center">
									<div class="flex items-center gap-2 bg-white/90 rounded-lg px-3 py-1.5">
										<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"></div>
										<span class="text-xs font-medium text-slate-700">Uploading...</span>
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<button
							type="button"
							class="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-slate-200 bg-slate-50/50 hover:border-slate-300 py-4 cursor-pointer transition-colors duration-150"
							onclick={() => hoverFileInput?.click()}
						>
							<svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
							</svg>
							<span class="text-xs text-slate-400">Add hover image</span>
						</button>
					{/if}
					{#if hoverUploadError}
						<p class="text-xs font-medium text-red-600">{hoverUploadError}</p>
					{/if}
					<input
						type="file"
						accept="image/*"
						class="sr-only"
						bind:this={hoverFileInput}
						onchange={handleHoverFileInput}
					/>
				</div>
			</div>
		</div>
	{/if}

	{#if errors.length > 0}
		<p class="text-xs font-medium text-red-600">{errors.join('; ')}</p>
	{/if}
</div>
