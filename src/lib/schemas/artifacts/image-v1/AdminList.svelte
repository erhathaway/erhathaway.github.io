<script lang="ts">
	import type { ImageV1Data } from './validator';

	type Props = {
		data: ImageV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`flex flex-col gap-3 ${className}`}>
	<img
		src={data.imageUrl}
		alt={data.description ?? ''}
		loading="lazy"
		class="h-40 w-full rounded-lg object-cover"
	/>
	{#if data.description}
		<p class="text-xs text-ash">{data.description}</p>
	{/if}
</div>
