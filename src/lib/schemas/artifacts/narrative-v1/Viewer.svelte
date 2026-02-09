<script lang="ts">
	import type { NarrativeV1Data } from './validator';

	type Props = {
		data: NarrativeV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();

	const align = $derived(data.align ?? 'center');
	const alignClass = $derived(
		align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'
	);
</script>

<div class={`py-10 px-6 max-w-xl mx-auto ${alignClass} ${className}`}>
	<p class="text-lg leading-relaxed text-cream/70" style="font-family: 'Cormorant Garamond', Georgia, serif; letter-spacing: 0.01em;">
		{data.text}
	</p>
</div>
