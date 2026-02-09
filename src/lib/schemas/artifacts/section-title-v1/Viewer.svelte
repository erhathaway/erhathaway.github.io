<script lang="ts">
	import type { SectionTitleV1Data } from './validator';

	type Props = {
		data: SectionTitleV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`sticky top-0 z-10 -mx-8 px-8 py-8 bg-white ${className}`}>
	<h2 class="text-xl text-walnut" style="font-family: Georgia, 'Times New Roman', serif; font-weight: 400; letter-spacing: 0.02em;">
		{data.title}
	</h2>
	{#if data.subtitle}
		<p class="mt-3 text-sm text-ash/50" style="font-family: 'DM Sans', sans-serif; font-weight: 300; letter-spacing: 0.02em;">
			{data.subtitle}
		</p>
	{/if}
</div>
