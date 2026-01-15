<script lang="ts">
	import ImageArtifactView from './ImageArtifactView.svelte';
	import { validateArtifactData } from '$lib/schemas/artifacts';

	type Props = {
		schema: string;
		data: unknown;
		className?: string;
	};

	let { schema, data, className = '' }: Props = $props();

	const isImageV1 = $derived(schema === 'image-v1');
	const validation = $derived.by(() => validateArtifactData(schema, data));
</script>

{#if !isImageV1}
	<div class={`rounded-lg border border-walnut/20 bg-cream/60 p-3 text-xs text-ash ${className}`}>
		Unknown schema: {schema}
	</div>
{:else if !validation.ok}
	<div class={`rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 ${className}`}>
		Invalid artifact data: {validation.errors.join('; ')}
	</div>
{:else}
	<ImageArtifactView data={validation.value} className={className} />
{/if}
