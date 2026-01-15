<script lang="ts">
	import type { ImageV1Data } from '$lib/schemas/artifacts/image-v1';

	type Props = {
		data: ImageV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<figure class={`space-y-3 ${className}`}>
	<img
		src={data.imageUrl}
		alt={data.description ?? ''}
		loading="lazy"
		class="w-full rounded-lg object-cover"
	/>
	{#if data.description}
		<figcaption class="text-xs text-ash">{data.description}</figcaption>
	{/if}
</figure>
