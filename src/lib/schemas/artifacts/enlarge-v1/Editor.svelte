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

	const widthPercent = $derived(typeof value.widthPercent === 'number' ? value.widthPercent : 50);
	const align = $derived(typeof value.align === 'string' ? value.align : 'center');

	const widthOptions = [25, 50, 75, 100] as const;
</script>

<div class="flex flex-col gap-4 py-4">
	<p class="text-xs text-slate-500">Enlarges the <strong>next image</strong> in order. Place this directly before the image you want to make bigger.</p>

	<div class="flex flex-col gap-1.5">
		<label class="text-xs font-medium text-slate-700">Width increase</label>
		<div class="flex gap-1.5">
			{#each widthOptions as w (w)}
				<button
					type="button"
					class={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
						widthPercent === w
							? 'border-slate-900 bg-slate-900 text-white'
							: 'border-slate-200 text-slate-500 hover:border-slate-300'
					}`}
					onclick={() => onChange({ ...value, widthPercent: w })}
				>
					+{w}%
				</button>
			{/each}
		</div>
	</div>

	<div class="flex flex-col gap-1.5">
		<label class="text-xs font-medium text-slate-700">Alignment</label>
		<div class="flex gap-1.5">
			<button
				type="button"
				class={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
					align === 'left'
						? 'border-slate-900 bg-slate-900 text-white'
						: 'border-slate-200 text-slate-500 hover:border-slate-300'
				}`}
				onclick={() => onChange({ ...value, align: 'left' })}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-width="2" d="M3 6h18M3 12h12M3 18h18" />
				</svg>
			</button>
			<button
				type="button"
				class={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
					align === 'center'
						? 'border-slate-900 bg-slate-900 text-white'
						: 'border-slate-200 text-slate-500 hover:border-slate-300'
				}`}
				onclick={() => onChange({ ...value, align: 'center' })}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-width="2" d="M3 6h18M6 12h12M3 18h18" />
				</svg>
			</button>
			<button
				type="button"
				class={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
					align === 'right'
						? 'border-slate-900 bg-slate-900 text-white'
						: 'border-slate-200 text-slate-500 hover:border-slate-300'
				}`}
				onclick={() => onChange({ ...value, align: 'right' })}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-width="2" d="M3 6h18M9 12h12M3 18h18" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Preview -->
	<div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
		<p class="text-[10px] text-slate-400 mb-2">Preview layout</p>
		<div class="flex {align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'}">
			<div class="h-8 rounded bg-slate-300/50 transition-all duration-200" style="width: {50 + widthPercent / 2}%"></div>
		</div>
	</div>
</div>
