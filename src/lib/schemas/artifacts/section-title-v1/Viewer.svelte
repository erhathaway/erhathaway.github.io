<script lang="ts">
	import type { SectionTitleV1Data } from './validator';

	type Props = {
		data: SectionTitleV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
</script>

<div class={`sticky top-0 z-10 py-6 bg-charcoal ${className}`}>
	<h2 class="text-2xl text-cream/90" style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 400; letter-spacing: 0.02em;">
		{data.title}
	</h2>
	{#if data.subtitle}
		<p class="mt-2 text-sm text-ash/70" style="font-family: 'DM Sans', sans-serif;">
			{data.subtitle}
		</p>
	{/if}
</div>
