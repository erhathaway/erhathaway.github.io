<script lang="ts">
	import type { ImageV1Data } from '../image-v1';

	type Props = {
		data: ImageV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`relative overflow-hidden rounded-2xl ${className}`}>
	<img
		src={data.imageUrl}
		alt={data.description ?? ''}
		loading="lazy"
		class="h-full w-full object-cover"
	/>
	{#if data.description}
		<div class="absolute bottom-0 left-0 right-0 bg-walnut/70 px-4 py-3 text-xs text-cream">
			{data.description}
		</div>
	{/if}
</div>
