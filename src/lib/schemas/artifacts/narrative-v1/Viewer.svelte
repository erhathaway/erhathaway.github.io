<script lang="ts">
	import type { NarrativeV1Data } from './validator';

	type Props = {
		data: NarrativeV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();

	const align = $derived(data.align ?? 'center');
	const alignClass = $derived(
		align === 'left' ? 'text-left mr-auto' : align === 'right' ? 'text-right ml-auto' : 'text-center mx-auto'
	);
</script>

<div class={`py-10 px-6 max-w-xl ${alignClass} ${className}`}>
	<p class="text-lg leading-relaxed text-cream/70 {data.italic ? 'italic' : ''}" style="font-family: 'Cormorant Garamond', Georgia, serif; letter-spacing: 0.01em;">
		{data.text}
	</p>
</div>
