<script lang="ts">
	type Props = {
		value: Record<string, unknown>;
		onChange: (next: Record<string, unknown>) => void;
		onUpload?: (file: File) => Promise<{ url: string }>;
		onUploadStateChange?: (state: { uploading: boolean; progress: number }) => void;
		googlePhotosConnected?: boolean;
		onGooglePhotosPick?: () => void;
	};

	let { value, onChange }: Props = $props();

	const source: string = $derived((value.source as string) ?? 'highlight');
</script>

<div class="flex flex-col gap-3 rounded-2xl bg-slate-100 p-4">
	<label class="text-xs font-medium text-slate-600">Image source</label>
	<div class="flex gap-2">
		<button
			type="button"
			class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 {source === 'highlight' ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}"
			onclick={() => onChange({ ...value, source: 'highlight' })}
		>
			Highlight
		</button>
		<button
			type="button"
			class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 {source === 'normal' ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}"
			onclick={() => onChange({ ...value, source: 'normal' })}
		>
			Normal
		</button>
	</div>
	<p class="text-[10px] text-slate-400">
		{source === 'highlight' ? 'Uses the highlight cover image (falls back to normal if none set).' : 'Uses the normal cover image.'}
	</p>
</div>
