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

	// Keep the optional divider aligned just beyond the text.
	let textWidth = $state<number | null>(null);
	function trackTextSize(node: HTMLElement) {
		const observer = new ResizeObserver(() => {
			textWidth = node.offsetWidth;
		});
		observer.observe(node);
		return () => observer.disconnect();
	}
</script>

<div
	class={['section-heading sticky -top-px z-10 -mx-8 px-8 py-8', { stuck }, className]}
	style:margin-bottom="calc(1.75rem + var(--section-title-stop, 0px))"
	{@attach trackStuck}
>
	<div
		class="section-border pointer-events-none absolute top-6 bottom-6 left-4"
		aria-hidden="true"
	></div>
	{#if data.showDivider && textWidth !== null}
		<!-- Starts 16px beyond the text's right edge. -->
		<div
			class={['section-line pointer-events-none absolute top-1/2 right-8 h-px bg-black/10', { stuck }]}
			style:left={`${textWidth + 48}px`}
		></div>
	{/if}
	<div class="w-fit max-w-full" {@attach trackTextSize}>
		<h2 data-typo="section-title" class="text-xl text-walnut" style="font-family: Georgia, 'Times New Roman', serif; font-weight: 400; letter-spacing: 0.02em;">
			{data.title}
		</h2>
		{#if data.subtitle}
			<p data-typo="section-subtitle" class="mt-3 text-sm text-ash/50" style="font-family: 'DM Sans', sans-serif; font-weight: 300; letter-spacing: 0.02em;">
				{data.subtitle}
			</p>
		{/if}
	</div>
</div>

<style>
	.section-heading {
		transition: background-color 0.2s ease, box-shadow 0.2s ease;
	}
	.section-heading.stuck {
		background-color: #fff9ed;
		box-shadow:
			inset 0 -1px rgba(184, 115, 51, 0.18),
			0 4px 12px rgba(44, 34, 24, 0.06);
	}
	.section-border {
		width: 1px;
		border-radius: 999px;
		background: #b87333;
	}
	/* Hide the divider while the heading is stuck at the top. */
	.section-line {
		transition: opacity 0.2s ease 0.15s;
	}
	.section-line.stuck {
		opacity: 0;
		transition: opacity 0.1s ease;
	}
	@media (prefers-reduced-motion: reduce) {
		.section-heading,
		.section-line,
		.section-line.stuck {
			transition: none;
		}
	}
</style>
