<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import LeftPanel from '$lib/components/LeftPanel.svelte';
	import { onNavigate } from '$app/navigation';

	let { children } = $props();

	// Enable View Transitions API
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="font-body bg-charcoal text-cream flex h-screen">
	<LeftPanel />
	<div class="flex-1" style="view-transition-name: main-content">
		{@render children()}
	</div>
</div>
