<script lang="ts">
	import type { ImageV1Data } from './validator';

	type Props = {
		data: ImageV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`flex flex-col gap-2.5 ${className}`}>
	<img
		src={data.imageUrl}
		alt={data.description ?? ''}
		loading="lazy"
		class="h-40 w-full rounded-xl object-cover border border-slate-200"
	/>
	{#if data.description}
		<p class="text-xs text-slate-500">{data.description}</p>
	{/if}
</div>
