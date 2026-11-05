<script lang="ts">
	import EmptyCardFill from './EmptyCardFill.svelte';
	import { useProjectBackground } from './project-background.svelte';

	// Fixed behind project pages, using the active empty card theme tinted to match the project's
	// image. On desktop the left panel's area gets its own frosted copy because the panel's
	// view-transition-name stops its backdrop-filter from reaching this layer. The main copy skips
	// that area so it can't show through a see-through fill.
	const background = useProjectBackground();
	const theme = $derived(background.theme);
	const tint = $derived(background.tint);
</script>

{#if theme.fill.type !== 'blank'}
	<div class="page-layer main-area pointer-events-none fixed inset-0 isolate" aria-hidden="true">
		<!-- Extends past the clip so the blur's soft edges stay out of view. -->
		<div class="page-blur absolute -inset-10">
			<EmptyCardFill fill={theme.fill} effects={theme.effects} sizes="100vw" />
		</div>
		<div class="tint absolute inset-0" style:background-color={tint ?? 'white'}></div>
	</div>
	<div
		class="page-layer frosted pointer-events-none fixed inset-0 isolate hidden lg:block"
		aria-hidden="true"
	>
		<div class="warm-glass-frost absolute -inset-10">
			<EmptyCardFill fill={theme.fill} effects={theme.effects} sizes="100vw" />
		</div>
		<div class="tint absolute inset-0" style:background-color={tint ?? 'white'}></div>
	</div>
{/if}

<style>
	.page-layer {
		background: white;
		overflow: hidden;
	}
	.page-blur {
		filter: blur(8px);
	}
	.tint {
		mix-blend-mode: multiply;
		transition: background-color 0.5s ease;
	}
	/* The left panel spans 12px to 332px from the left at the lg breakpoint and above. */
	@media (min-width: 1024px) {
		.main-area {
			clip-path: inset(0 0 0 332px);
		}
		.frosted {
			clip-path: inset(0 calc(100% - 332px) 0 12px);
		}
	}
</style>
