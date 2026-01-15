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
		<span class="text-ash text-sm">Image</span>
		<div
			class="rounded-lg border border-dashed border-walnut/30 bg-cream/70 px-4 py-6 text-center text-sm text-ash"
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
			<p>{uploading ? 'Uploading...' : 'Drag and drop an image here'}</p>
			<button
				type="button"
				class="mt-2 inline-flex items-center justify-center rounded-full border border-walnut/20 px-3 py-1 text-xs text-walnut hover:border-copper hover:text-copper"
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
		<div class="mt-2 h-56 w-full overflow-hidden rounded-lg bg-walnut/5">
			{#if displayUrl}
				<img
					src={displayUrl}
					alt={current.description ?? ''}
					class="h-full w-full object-cover"
				/>
			{/if}
		</div>
		{#if uploadError}
			<p class="text-xs text-red-700">{uploadError}</p>
		{/if}
	</div>
	<label class="text-sm">
		<span class="text-ash">Description (optional)</span>
		<textarea
			rows="3"
			value={current.description ?? ''}
			oninput={updateDescription}
			class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
		></textarea>
	</label>

	{#if errors.length > 0}
		<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
			{errors.join('; ')}
		</div>
	{/if}
</div>
