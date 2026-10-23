<script lang="ts">
	import { themeCss, FONT_STYLESHEET, type TypographyTheme } from './index';
	let { theme, enabled = true }: { theme: TypographyTheme; enabled?: boolean } = $props();
	const css = $derived(enabled ? themeCss(theme) : '');
</script>

<svelte:head>
	<link rel="stylesheet" href={FONT_STYLESHEET} />
	<svelte:element this={'style'}>{css}</svelte:element>
</svelte:head>
