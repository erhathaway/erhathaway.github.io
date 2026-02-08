<script lang="ts">
	import type { SectionTitleV1Data } from './validator';

	type Props = {
		data: SectionTitleV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`flex items-center justify-center rounded-2xl bg-slate-100 p-6 ${className}`}>
	<span class="text-sm text-slate-500" style="font-family: 'Cormorant Garamond', Georgia, serif;">{data.title || 'Section Title'}</span>
</div>
