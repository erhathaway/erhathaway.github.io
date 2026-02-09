<script lang="ts">
	import { validateArtifactData, getArtifactComponent } from '$lib/schemas/artifacts';

	type Props = {
		schema: string;
		data: unknown;
		className?: string;
		eager?: boolean;
		aspectRatio?: number;
	};

	let { schema, data, className = '', eager = false, aspectRatio }: Props = $props();

	const validation = $derived.by(() => validateArtifactData(schema, data));
	const ViewerComponent = $derived(getArtifactComponent(schema, 'publicViewProjectPage'));
</script>

{#if !validation.ok}
	<div class={`rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 ${className}`}>
		Invalid artifact data: {validation.errors.join('; ')}
	</div>
{:else if ViewerComponent}
	<ViewerComponent data={validation.value} {className} {eager} {aspectRatio} />
{:else}
	<div class={`rounded-lg border border-walnut/20 bg-cream/60 p-3 text-xs text-ash ${className}`}>
		Unknown schema: {schema}
	</div>
{/if}
