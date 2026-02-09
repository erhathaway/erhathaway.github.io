<script lang="ts">
	import type { NarrativeV1Data } from './validator';

	type Props = {
		data: NarrativeV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`flex items-center justify-center rounded-2xl bg-slate-100 p-6 ${className}`}>
	<span class="text-sm text-slate-500 italic" style="font-family: 'Cormorant Garamond', Georgia, serif;">{data.text || 'Narrative'}</span>
</div>
