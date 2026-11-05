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

	const showDivider = $derived(value.showDivider !== false);

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
	<div class="flex items-center gap-2.5">
		<button
			type="button"
			role="switch"
			aria-checked={showDivider}
			aria-label="Show divider"
			onclick={() => onChange({ ...value, showDivider: !showDivider })}
			class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${showDivider ? 'bg-slate-600' : 'bg-slate-200'}`}
		>
			<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${showDivider ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
		</button>
		<span class="text-xs text-slate-500">{showDivider ? 'Divider on the right' : 'No divider'}</span>
	</div>
</div>
