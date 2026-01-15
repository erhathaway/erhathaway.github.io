<script lang="ts">
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

	const handleFile = async (file: File) => {
		if (!onUpload) {
			setUploadState({ uploading: false, error: 'Upload handler not configured.' });
			return;
		}

		setUploadState({ uploading: true, error: null });

		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		const nextPreview = URL.createObjectURL(file);
		previewUrl = nextPreview;
		onChange?.({
			imageUrl: nextPreview,
			description: current.description?.trim() || undefined
		});

		try {
			const uploadedUrl = await onUpload(file);
			onChange?.({
				imageUrl: uploadedUrl,
				description: current.description?.trim() || undefined
			});
			URL.revokeObjectURL(nextPreview);
			previewUrl = null;
			setUploadState({ uploading: false, error: null });
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Upload failed.';
			setUploadState({ uploading: false, error: message });
		}
	};

	const handleFileInput = async (event: Event) => {
		const target = event.currentTarget as HTMLInputElement | null;
		const file = target?.files?.[0];
		if (!file) return;
		await handleFile(file);
		if (target) target.value = '';
	};

	const handleDrop = async (event: DragEvent) => {
		event.preventDefault();
		const file = event.dataTransfer?.files?.[0];
		if (!file) return;
		await handleFile(file);
	};

	const handleDragOver = (event: DragEvent) => {
		event.preventDefault();
	};
</script>

<div class="grid gap-4">
	<div class="grid gap-2">
		<span class="text-ash text-sm">Image</span>
		<div
			class="rounded-lg border border-dashed border-walnut/30 bg-cream/70 px-4 py-6 text-center text-sm text-ash"
			ondrop={handleDrop}
			ondragover={handleDragOver}
			role="button"
			tabindex="0"
			onkeydown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					(event.currentTarget as HTMLElement | null)?.querySelector('input')?.click();
				}
			}}
		>
			<p>{uploading ? 'Uploading...' : 'Drag and drop an image here'}</p>
			<label class="mt-2 inline-flex cursor-pointer items-center justify-center rounded-full border border-walnut/20 px-3 py-1 text-xs text-walnut hover:border-copper hover:text-copper">
				Choose file
				<input
					type="file"
					accept="image/*"
					class="sr-only"
					onchange={handleFileInput}
				/>
			</label>
		</div>
		{#if current.imageUrl}
			<img
				src={current.imageUrl}
				alt={current.description ?? ''}
				class="mt-2 max-h-56 w-full rounded-lg object-cover"
			/>
		{/if}
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
