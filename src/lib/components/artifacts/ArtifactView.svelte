<script lang="ts">
	import ImageArtifactViewer from '$lib/schemas/artifacts/image-v1/Viewer.svelte';
	import VideoArtifactViewer from '$lib/schemas/artifacts/video-v1/Viewer.svelte';
	import { validateArtifactData } from '$lib/schemas/artifacts';
	import type { ImageV1Data } from '$lib/schemas/artifacts/image-v1/validator';
	import type { VideoV1Data } from '$lib/schemas/artifacts/video-v1/validator';

	type Props = {
		schema: string;
		data: unknown;
		className?: string;
	};

	let { schema, data, className = '' }: Props = $props();

	const validation = $derived.by(() => validateArtifactData(schema, data));
</script>

{#if !validation.ok}
	<div class={`rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 ${className}`}>
		Invalid artifact data: {validation.errors.join('; ')}
	</div>
{:else if schema === 'image-v1'}
	<ImageArtifactViewer data={validation.value as ImageV1Data} className={className} />
{:else if schema === 'video-v1'}
	<VideoArtifactViewer data={validation.value as VideoV1Data} className={className} />
{:else}
	<div class={`rounded-lg border border-walnut/20 bg-cream/60 p-3 text-xs text-ash ${className}`}>
		Unknown schema: {schema}
	</div>
{/if}
