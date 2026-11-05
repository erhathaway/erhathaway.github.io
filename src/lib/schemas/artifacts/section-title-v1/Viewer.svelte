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

	// The resting frame hugs the text, so it and the divider need the text's width to line up with.
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
	class={['sticky -top-px z-10 -mx-8 px-8 py-8', className]}
	style:margin-bottom="calc(1.75rem + var(--section-title-stop, 0px))"
	{@attach trackStuck}
>
	<div
		class={['section-frame absolute top-3 bottom-3 left-4 -z-10 border', { stuck, ready: textWidth !== null }]}
		style:--text-width={textWidth === null ? undefined : `${textWidth}px`}
	></div>
	{#if data.showDivider && textWidth !== null}
		<!-- Starts at the resting frame's right edge: 48px of insets plus the text. -->
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
	.section-frame {
		/* 16px frame inset + 32px text inset leaves 16px of frame padding beyond the text. */
		right: max(16px, calc(100% - var(--text-width, 100%) - 48px));
		border-color: rgba(61, 46, 30, 0.14);
		background: rgba(252, 240, 224, 0.5);
		/* A soft inner glow, warming the glass to match the side nav. */
		box-shadow: inset 0 0 28px rgba(240, 190, 130, 0.07);
		-webkit-backdrop-filter: blur(40px) saturate(115%);
		backdrop-filter: blur(40px) saturate(115%);
	}
	.section-frame.ready {
		transition:
			right 0.35s cubic-bezier(0.16, 1, 0.3, 1),
			background-color 0.25s ease;
	}
	.section-frame.stuck {
		right: 16px;
		background: rgba(251, 241, 227, 0.94);
	}
	/* The frame grows over the line when stuck, so the line hides first and returns after it shrinks. */
	.section-line {
		transition: opacity 0.2s ease 0.15s;
	}
	.section-line.stuck {
		opacity: 0;
		transition: opacity 0.1s ease;
	}
	@media (prefers-reduced-motion: reduce) {
		.section-frame.ready,
		.section-line,
		.section-line.stuck {
			transition: none;
		}
	}
</style>
