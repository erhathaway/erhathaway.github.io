<script lang="ts">
	import type { EnlargeV1Data } from './validator';

	type Props = {
		data: EnlargeV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();

	const alignLabel = $derived(data.align === 'left' ? 'Left' : data.align === 'right' ? 'Right' : 'Center');
</script>

<div class={`flex items-center gap-3 py-3 ${className}`}>
	<hr class="flex-1 border-t border-dashed border-slate-200" />
	<span class="text-xs font-medium text-slate-400 uppercase tracking-wider">Enlarge +{data.widthPercent}% · {alignLabel}</span>
	<svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
	</svg>
	<hr class="flex-1 border-t border-dashed border-slate-200" />
</div>
