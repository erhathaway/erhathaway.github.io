<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { validateImageV1 } from './validator';
	import type { ImageV1Data } from './validator';

	type Props = {
		value?: ImageV1Data;
		onChange?: (value: ImageV1Data) => void;
		onUpload?: (file: File) => Promise<string>;
		onUploadStateChange?: (state: { uploading: boolean; error: string | null }) => void;
	};

	let { value, onChange, onUpload, onUploadStateChange }: Props = $props();

	const current = $derived(value ?? { imageUrl: '', description: '' });
	const validation = $derived.by(() => validateImageV1(current));
	const errors = $derived(validation.ok ? [] : validation.errors);
	let previewUrl = $state<string | null>(null);
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let fileInput: HTMLInputElement | null = null;

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

	onDestroy(() => {
		clearPreview();
	});
</script>

<div class="grid gap-4">
	<div class="grid gap-2">
		<span class="text-xs font-medium text-slate-600">Image</span>
		<div
			class="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-all duration-150 cursor-pointer"
			ondrop={handleDrop}
			ondragover={handleDragOver}
			onclick={triggerFilePicker}
			role="button"
			tabindex="0"
			onkeydown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					triggerFilePicker();
				}
			}}
		>
			{#if uploading}
				<div class="flex items-center justify-center gap-2">
					<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500"></div>
					<p class="text-sm text-slate-500">Uploading...</p>
				</div>
			{:else}
				<svg class="mx-auto mb-2 w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<p>Drag and drop an image here</p>
			{/if}
			<button
				type="button"
				class="mt-2 inline-flex items-center justify-center rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors duration-150"
				onclick={(event) => {
					event.stopPropagation();
					triggerFilePicker();
				}}
			>
				Choose file
			</button>
			<input
				type="file"
				accept="image/*"
				class="sr-only"
				{@attach attachFileInput}
				onchange={handleFileInput}
			/>
		</div>
		{#if displayUrl}
			<div class="mt-1 h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
				<img
					src={displayUrl}
					alt={current.description ?? ''}
					class="h-full w-full object-cover"
				/>
			</div>
		{:else}
			<div class="mt-1 h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
				<p class="text-xs text-slate-300">No image</p>
			</div>
		{/if}
		{#if uploadError}
			<p class="text-xs font-medium text-red-600">{uploadError}</p>
		{/if}
	</div>
	<label class="grid gap-1.5">
		<span class="text-xs font-medium text-slate-600">Description (optional)</span>
		<textarea
			rows="3"
			value={current.description ?? ''}
			oninput={updateDescription}
			class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
		></textarea>
	</label>

	{#if errors.length > 0}
		<div class="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
			{errors.join('; ')}
		</div>
	{/if}
</div>
