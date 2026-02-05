<script lang="ts">
	import type { VideoV1Data } from './validator';

	type Props = {
		data: VideoV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<figure class={`space-y-3 ${className}`}>
	<video
		src={data.videoUrl}
		poster={data.thumbnailUrl}
		controls
		preload="metadata"
		class="w-full rounded-lg"
	>
		<track kind="captions" />
	</video>
	{#if data.description}
		<figcaption class="text-xs text-ash">{data.description}</figcaption>
	{/if}
</figure>
