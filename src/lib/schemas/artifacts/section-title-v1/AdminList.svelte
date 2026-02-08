<script lang="ts">
	import type { SectionTitleV1Data } from './validator';

	type Props = {
		data: SectionTitleV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`flex flex-col gap-1 py-3 ${className}`}>
	<span class="text-xs font-medium text-slate-400 uppercase tracking-wider">Section Title</span>
	<p class="text-sm font-semibold text-slate-800" style="font-family: 'Cormorant Garamond', Georgia, serif;">
		{data.title || 'Untitled'}
	</p>
	{#if data.subtitle}
		<p class="text-xs text-slate-500">{data.subtitle}</p>
	{/if}
</div>
