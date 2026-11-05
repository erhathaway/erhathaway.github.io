<script lang="ts">
	import { themeCss, type TypographyTheme } from './index';
	let { theme, enabled = true }: { theme: TypographyTheme; enabled?: boolean } = $props();
	const css = $derived(enabled ? themeCss(theme) : '');
</script>

<!-- The font stylesheet itself is loaded from app.html, where it doesn't block rendering. -->
<svelte:head>
	<svelte:element this={'style'}>{css}</svelte:element>
</svelte:head>
