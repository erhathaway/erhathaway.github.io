<script lang="ts">
	import type { NarrativeV1Data } from './validator';

	type Props = {
		data: NarrativeV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`py-3 ${className}`}>
	<span class="text-xs font-medium text-slate-400 uppercase tracking-wider">Narrative</span>
	<p class="text-sm text-slate-600 mt-1 italic line-clamp-3" style="font-family: 'Cormorant Garamond', Georgia, serif;">
		{data.text || 'Empty narrative'}
	</p>
</div>
