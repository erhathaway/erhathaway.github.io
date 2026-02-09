<script lang="ts">
	import type { DenseSectionV1Data } from './validator';

	type Props = {
		data: DenseSectionV1Data;
		className?: string;
	};

	let { className = '' }: Props = $props();
</script>

<!-- Dense section markers are invisible on the public page; rendering is handled by the segment logic -->
<div class={className}></div>
