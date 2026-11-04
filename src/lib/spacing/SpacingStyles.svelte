<script lang="ts">
	import { themeCss, type SpacingTheme } from './index';
	let { theme }: { theme: SpacingTheme } = $props();
	const css = $derived(themeCss(theme));
</script>

<svelte:head><svelte:element this={'style'}>{css}</svelte:element></svelte:head>
