<script lang="ts">
	import type { DividerV1Data } from './validator';

	type Props = {
		data: DividerV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`flex items-center gap-3 py-3 ${className}`}>
	{#if data.showLine}
		<hr class="flex-1 border-t border-slate-300" />
	{:else}
		<hr class="flex-1 border-t border-dashed border-slate-200" />
	{/if}
	<span class="text-xs font-medium text-slate-400 uppercase tracking-wider">Divider</span>
	{#if data.showLine}
		<hr class="flex-1 border-t border-slate-300" />
	{:else}
		<hr class="flex-1 border-t border-dashed border-slate-200" />
	{/if}
</div>
