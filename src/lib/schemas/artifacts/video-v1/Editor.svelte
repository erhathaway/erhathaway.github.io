<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { validateVideoV1 } from './validator';
	import type { VideoV1Data } from './validator';

	type Props = {
		value?: VideoV1Data;
		onChange?: (value: VideoV1Data) => void;
		onUpload?: (file: File) => Promise<string>;
		onUploadStateChange?: (state: { uploading: boolean; error: string | null }) => void;
	};

	let { value, onChange, onUpload, onUploadStateChange }: Props = $props();

	const current = $derived(value ?? { videoUrl: '', thumbnailUrl: '', description: '' });
	const validation = $derived.by(() => validateVideoV1(current));
	const errors = $derived(validation.ok ? [] : validation.errors);
	let previewUrl = $state<string | null>(null);
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let fileInput: HTMLInputElement | null = null;
	let isDragOver = $state(false);

	const setUploadState = (next: { uploading: boolean; error: string | null }) => {
		uploading = next.uploading;
		uploadError = next.error;
		onUploadStateChange?.(next);
	};

	const updateDescription = (event: Event) => {
		const target = event.currentTarget as HTMLTextAreaElement | null;
		const next: VideoV1Data = {
			videoUrl: current.videoUrl?.trim() || '',
			thumbnailUrl: current.thumbnailUrl?.trim() || undefined,
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
				videoUrl: uploadedUrl,
				thumbnailUrl: current.thumbnailUrl?.trim() || undefined,
				description: current.description?.trim() || undefined
			});
			await tick();
			setUploadState({ uploading: false, error: null });
			clearPreview();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Upload failed.';
			setUploadState({ uploading: false, error: message });
			if (current.videoUrl) {
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

	const displayUrl = $derived.by(() => {
		if (uploading && previewUrl) return previewUrl;
		if (!current.videoUrl && previewUrl) return previewUrl;
		return current.videoUrl ?? '';
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

<div class="grid gap-3">
	<div
		class={`relative rounded-xl border-2 border-dashed overflow-hidden transition-colors duration-150 ${
			isDragOver
				? 'border-slate-400 bg-slate-100'
				: displayUrl
					? 'border-transparent bg-slate-50'
					: 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
		}`}
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragenter={() => (isDragOver = true)}
		ondragleave={() => (isDragOver = false)}
		role="button"
		tabindex="0"
		onclick={triggerFilePicker}
		onkeydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				triggerFilePicker();
			}
		}}
	>
		{#if displayUrl}
			<div class="relative group cursor-pointer">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					src={displayUrl}
					class={`w-full max-h-64 object-cover ${uploading ? 'opacity-50' : ''}`}
					preload="metadata"
				></video>
				<div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-150">
					{#if uploading}
						<div class="flex items-center gap-2 bg-white/90 rounded-lg px-3 py-1.5">
							<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"></div>
							<span class="text-xs font-medium text-slate-700">Uploading...</span>
						</div>
					{:else}
						<span class="text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150">Replace video</span>
					{/if}
				</div>
			</div>
		{:else}
			<div class="relative group cursor-pointer h-48 bg-slate-100 flex flex-col items-center justify-center gap-2">
				<svg class="w-8 h-8 text-slate-300 group-hover:text-slate-400 transition-colors duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
				</svg>
				<p class="text-xs text-slate-400 group-hover:text-slate-500 transition-colors duration-150">Drop video or click to upload</p>
			</div>
		{/if}
		<input
			type="file"
			accept="video/*"
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
