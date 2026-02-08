<script lang="ts">
	type Props = {
		value: Record<string, unknown>;
		onChange: (next: Record<string, unknown>) => void;
		onUpload?: (file: File) => Promise<string | { url: string; formats?: string[] }>;
		onUploadStateChange?: (state: { uploading: boolean; error: string | null }) => void;
		googlePhotosConnected?: boolean;
		onGooglePhotosPick?: () => void;
	};

	let { value, onChange }: Props = $props();

	function handleTitleInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		onChange({ ...value, title: target.value });
	}

	function handleSubtitleInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		onChange({ ...value, subtitle: target.value });
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-col gap-1.5">
		<label for="section-title" class="text-xs font-medium text-slate-600">Title <span class="text-red-400">*</span></label>
		<input
			id="section-title"
			type="text"
			value={typeof value.title === 'string' ? value.title : ''}
			oninput={handleTitleInput}
			placeholder="Section title"
			class="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
		/>
	</div>
	<div class="flex flex-col gap-1.5">
		<label for="section-subtitle" class="text-xs font-medium text-slate-600">Subtitle <span class="text-slate-300">(optional)</span></label>
		<input
			id="section-subtitle"
			type="text"
			value={typeof value.subtitle === 'string' ? value.subtitle : ''}
			oninput={handleSubtitleInput}
			placeholder="Optional subtitle"
			class="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
		/>
	</div>
</div>
