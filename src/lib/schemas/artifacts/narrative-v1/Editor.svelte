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

	const align = $derived((typeof value.align === 'string' ? value.align : 'center') as 'left' | 'center' | 'right');
	const italic = $derived(!!value.italic);

	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLTextAreaElement;
		onChange({ ...value, text: target.value });
	}

	function setAlign(a: 'left' | 'center' | 'right') {
		onChange({ ...value, align: a });
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-col gap-1.5">
		<label for="narrative-text" class="text-xs font-medium text-slate-600">Narrative text <span class="text-red-400">*</span></label>
		<textarea
			id="narrative-text"
			value={typeof value.text === 'string' ? value.text : ''}
			oninput={handleInput}
			placeholder="Tell the story between the images..."
			rows="4"
			class="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150 resize-y"
		></textarea>
	</div>
	<div class="flex items-center gap-1.5">
		<span class="text-xs font-medium text-slate-600 mr-1">Align</span>
		<button
			type="button"
			class={`p-1.5 rounded-lg transition-colors duration-150 ${align === 'left' ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
			onclick={() => setAlign('left')}
			title="Left"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-width="2" d="M3 6h18M3 12h12M3 18h16" />
			</svg>
		</button>
		<button
			type="button"
			class={`p-1.5 rounded-lg transition-colors duration-150 ${align === 'center' ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
			onclick={() => setAlign('center')}
			title="Center"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-width="2" d="M3 6h18M6 12h12M4 18h16" />
			</svg>
		</button>
		<button
			type="button"
			class={`p-1.5 rounded-lg transition-colors duration-150 ${align === 'right' ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
			onclick={() => setAlign('right')}
			title="Right"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-width="2" d="M3 6h18M9 12h12M5 18h16" />
			</svg>
		</button>
		<button
			type="button"
			class={`p-1.5 rounded-lg transition-colors duration-150 ml-2 ${italic ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
			onclick={() => onChange({ ...value, italic: !italic })}
			title="Italic"
		>
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
				<path stroke-linecap="round" stroke-width="2" d="M10 4h4m-2 0l-4 16m0 0h4" />
			</svg>
		</button>
	</div>
</div>
