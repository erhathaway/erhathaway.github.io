<script lang="ts">
	import type { SectionTitleV1Data } from './validator';

	type Props = {
		data: SectionTitleV1Data;
		className?: string;
	};

	let { data, className = '' }: Props = $props();
	let stuck = $state(false);

	// Sitting at top: -1px, the heading is clipped by 1px only while stuck at the top of the page.
	function trackStuck(node: HTMLElement) {
		const observer = new IntersectionObserver(
			([entry]) => {
				stuck = entry.intersectionRatio < 1 && entry.boundingClientRect.top <= 0;
			},
			// Watching for 0 too catches jumps straight from stuck to out of view.
			{ threshold: [0, 1] }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}
</script>

<div class={`sticky -top-px z-10 -mx-8 px-8 py-8 ${className}`} {@attach trackStuck}>
	{#if stuck}
		<div class="soft-glass absolute inset-x-4 top-3 bottom-1 -z-10 border" style="border-color: rgba(61, 46, 30, 0.14);"></div>
	{/if}
	<h2 data-typo="section-title" class="text-xl text-walnut" style="font-family: Georgia, 'Times New Roman', serif; font-weight: 400; letter-spacing: 0.02em;">
		{data.title}
	</h2>
	{#if data.subtitle}
		<p data-typo="section-subtitle" class="mt-3 text-sm text-ash/50" style="font-family: 'DM Sans', sans-serif; font-weight: 300; letter-spacing: 0.02em;">
			{data.subtitle}
		</p>
	{/if}
</div>
