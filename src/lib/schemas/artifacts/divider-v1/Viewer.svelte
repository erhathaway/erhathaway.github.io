<script lang="ts">
	import type { DividerV1Data } from './validator';

	type Props = {
		data: DividerV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`pt-12 pb-4 ${className}`}>
	{#if data.showLine}
		<div class="h-px w-full bg-black/10"></div>
	{/if}
</div>
