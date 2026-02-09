<script lang="ts">
	import type { EnlargeV1Data } from './validator';

	type Props = {
		data: EnlargeV1Data;
		className?: string;
	};

	let { className = '' }: Props = $props();
</script>

<!-- Enlarge markers are invisible; the public page rendering logic handles the enlarged image -->
<div class={className}></div>
