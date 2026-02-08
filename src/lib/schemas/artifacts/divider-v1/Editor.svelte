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

	const showLine = $derived(!!value.showLine);
</script>

<div class="flex flex-col gap-3 py-4">
	<div class="flex items-center gap-3 w-full">
		{#if showLine}
			<hr class="flex-1 border-t border-slate-300" />
		{:else}
			<hr class="flex-1 border-t border-dashed border-slate-200" />
		{/if}
		<span class="text-xs font-medium text-slate-500">Divider</span>
		{#if showLine}
			<hr class="flex-1 border-t border-slate-300" />
		{:else}
			<hr class="flex-1 border-t border-dashed border-slate-200" />
		{/if}
	</div>
	<div class="flex items-center gap-2.5">
		<button
			type="button"
			role="switch"
			aria-checked={showLine}
			aria-label="Show line"
			onclick={() => onChange({ ...value, showLine: !showLine })}
			class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${showLine ? 'bg-slate-600' : 'bg-slate-200'}`}
		>
			<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${showLine ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
		</button>
		<span class="text-xs text-slate-500">{showLine ? 'Visible line' : 'Spacing only'}</span>
	</div>
	<p class="text-xs text-slate-400">This divider spans the full width and starts a new row.</p>
</div>
