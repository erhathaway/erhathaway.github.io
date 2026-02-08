<script lang="ts">
	import type { DividerV1Data } from './validator';

	type Props = {
		data: DividerV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`py-4 ${className}`}>
	{#if data.showLine}
		<hr class="border-t border-ash/30" />
	{/if}
</div>
