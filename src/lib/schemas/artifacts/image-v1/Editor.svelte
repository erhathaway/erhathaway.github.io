<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { validateImageV1 } from './validator';
	import type { ImageV1Data } from './validator';

	type Props = {
		value?: ImageV1Data;
		onChange?: (value: ImageV1Data) => void;
		onUpload?: (file: File) => Promise<string>;
		onUploadStateChange?: (state: { uploading: boolean; error: string | null }) => void;
		googlePhotosConnected?: boolean;
		onGooglePhotosPick?: () => void;
	};

	let { value, onChange, onUpload, onUploadStateChange, googlePhotosConnected = false, onGooglePhotosPick }: Props = $props();

	const current = $derived(value ?? { imageUrl: '', description: '' });
	const validation = $derived.by(() => validateImageV1(current));
	const errors = $derived(validation.ok ? [] : validation.errors);
	let previewUrl = $state<string | null>(null);
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let fileInput: HTMLInputElement | null = null;
	let isDragOver = $state(false);
	let step = $state<'idle' | 'pick-source'>('idle');

	const hasImage = $derived(!!displayUrl);

	const setUploadState = (next: { uploading: boolean; error: string | null }) => {
		uploading = next.uploading;
		uploadError = next.error;
		onUploadStateChange?.(next);
	};

	const updateDescription = (event: Event) => {
		const target = event.currentTarget as HTMLTextAreaElement | null;
		const next = {
			imageUrl: current.imageUrl?.trim() || '',
			description: (target?.value ?? '').trim() || undefined
		};
		onChange?.(next);
	};

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
			const uploadedUrl = await onUpload(file);
			onChange?.({
				imageUrl: uploadedUrl,
				description: current.description?.trim() || undefined
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

	const handleFileInput = async (event: Event) => {
		event.stopPropagation();
		const target = event.currentTarget as HTMLInputElement | null;
		const file = target?.files?.[0];
		if (!file) return;
		await handleFile(file);
		if (target) target.value = '';
	};

	const handleDrop = async (event: DragEvent) => {
		event.preventDefault();
		event.stopPropagation();
		isDragOver = false;
		const file = event.dataTransfer?.files?.[0];
		if (!file) return;
		await handleFile(file);
	};

	const handleDragOver = (event: DragEvent) => {
		event.preventDefault();
		event.stopPropagation();
	};

	const triggerFilePicker = () => {
		fileInput?.click();
	};

	const handleZoneClick = () => {
		if (hasImage && !uploading) {
			step = 'pick-source';
		} else if (!hasImage && step === 'idle') {
			// No image yet — if google photos is available, show source picker; otherwise open file picker
			if (googlePhotosConnected && onGooglePhotosPick) {
				step = 'pick-source';
			} else {
				triggerFilePicker();
			}
		}
	};

	const displayUrl = $derived.by(() => {
		if (uploading && previewUrl) return previewUrl;
		if (!current.imageUrl && previewUrl) return previewUrl;
		return current.imageUrl ?? '';
	});

	const attachFileInput = (node: HTMLInputElement) => {
		fileInput = node;
		return {
			destroy() {
				if (fileInput === node) {
					fileInput = null;
				}
			}
		};
	};

	// Handle paste events when this component is focused or visible
	onMount(() => {
		function onPaste(e: ClipboardEvent) {
			const items = e.clipboardData?.items;
			if (!items) return;
			for (const item of Array.from(items)) {
				if (item.kind === 'file' && item.type.startsWith('image/')) {
					const file = item.getAsFile();
					if (file) {
						e.preventDefault();
						handleFile(file);
						return;
					}
				}
			}
		}
		document.addEventListener('paste', onPaste);
		return () => document.removeEventListener('paste', onPaste);
	});

	onDestroy(() => {
		clearPreview();
	});
</script>

<div class="grid gap-3">
	<!-- Combined upload / preview zone -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class={`relative rounded-xl border-2 border-dashed overflow-hidden transition-colors duration-150 ${
			isDragOver
				? 'border-slate-400 bg-slate-100'
				: displayUrl && step === 'idle'
					? 'border-transparent bg-slate-50'
					: 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
		}`}
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragenter={() => (isDragOver = true)}
		ondragleave={() => (isDragOver = false)}
	>
		{#if step === 'pick-source'}
			<!-- Source picker -->
			<div class="flex flex-col items-center justify-center gap-4 py-8 px-4">
				<div class="flex gap-3">
					<button
						type="button"
						class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-400 hover:shadow-sm transition-all duration-150"
						onclick={(e) => {
							e.stopPropagation();
							step = 'idle';
							triggerFilePicker();
						}}
					>
						<svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
						</svg>
						<span class="text-xs font-medium text-slate-600">Upload File</span>
					</button>
					{#if googlePhotosConnected && onGooglePhotosPick}
						<button
							type="button"
							class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-400 hover:shadow-sm transition-all duration-150"
							onclick={(e) => {
								e.stopPropagation();
								step = 'idle';
								onGooglePhotosPick?.();
							}}
						>
							<svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							<span class="text-xs font-medium text-slate-600">Google Photos</span>
						</button>
					{/if}
				</div>
				<button
					type="button"
					class="text-[11px] text-slate-400 hover:text-slate-600 transition-colors duration-150"
					onclick={(e) => { e.stopPropagation(); step = 'idle'; }}
				>
					&larr; Back
				</button>
			</div>
		{:else if displayUrl}
			<!-- Has image: show preview with hover overlay -->
			<div
				class="relative group cursor-pointer"
				role="button"
				tabindex="0"
				onclick={handleZoneClick}
				onkeydown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						handleZoneClick();
					}
				}}
			>
				<img
					src={displayUrl}
					alt={current.description ?? ''}
					class={`w-full max-h-64 object-cover ${uploading ? 'opacity-50' : ''}`}
				/>
				<div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-150">
					{#if uploading}
						<div class="flex items-center gap-2 bg-white/90 rounded-lg px-3 py-1.5">
							<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"></div>
							<span class="text-xs font-medium text-slate-700">Uploading...</span>
						</div>
					{:else}
						<span class="text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150">Replace image</span>
					{/if}
				</div>
			</div>
		{:else}
			<!-- No image: placeholder -->
			<div
				class="relative group cursor-pointer h-48 bg-slate-100 flex flex-col items-center justify-center gap-2"
				role="button"
				tabindex="0"
				onclick={handleZoneClick}
				onkeydown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						handleZoneClick();
					}
				}}
			>
				<svg class="w-8 h-8 text-slate-300 group-hover:text-slate-400 transition-colors duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<p class="text-xs text-slate-400 group-hover:text-slate-500 transition-colors duration-150">Drag from desktop, upload, or paste</p>
			</div>
		{/if}
		<input
			type="file"
			accept="image/*"
			class="sr-only"
			{@attach attachFileInput}
			onchange={handleFileInput}
		/>
	</div>

	{#if uploadError}
		<p class="text-xs font-medium text-red-600">{uploadError}</p>
	{/if}

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

	{#if errors.length > 0}
		<p class="text-xs font-medium text-red-600">{errors.join('; ')}</p>
	{/if}
</div>
