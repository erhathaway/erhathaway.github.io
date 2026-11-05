<script lang="ts">
	import EmptyCardFill from './EmptyCardFill.svelte';
	import { useProjectBackground } from './project-background.svelte';

	// The mobile menu slides over the page, so its frosted background travels inside it. Rendered
	// only for fills that aren't blank; it's opaque, so page content can't show through the text.
	const background = useProjectBackground();
</script>

<div class="frost pointer-events-none absolute inset-0 -z-10 isolate" aria-hidden="true">
	<!-- Extends past the clip so the blur's soft edges stay out of view. -->
	<div class="warm-glass-frost absolute -inset-10">
		<EmptyCardFill fill={background.theme.fill} effects={background.theme.effects} sizes="320px" />
	</div>
	<div class="tint absolute inset-0" style:background-color={background.tint ?? 'white'}></div>
	<div class="warm-glass absolute inset-0"></div>
</div>

<style>
	.frost {
		background: white;
		overflow: hidden;
	}
	.tint {
		mix-blend-mode: multiply;
		transition: background-color 0.5s ease;
	}
</style>
