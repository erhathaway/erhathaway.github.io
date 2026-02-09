<script lang="ts">
	import type { DenseSectionV1Data } from './validator';

	type Props = {
		data: DenseSectionV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`flex items-center gap-3 py-3 ${className}`}>
	<hr class="flex-1 border-t-2 border-dashed border-indigo-300" />
	<span class="text-xs font-medium text-indigo-500 uppercase tracking-wider">Dense #{data.pairId}</span>
	<hr class="flex-1 border-t-2 border-dashed border-indigo-300" />
</div>
