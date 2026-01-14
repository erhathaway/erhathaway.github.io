<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import LeftPanel from '$lib/components/LeftPanel.svelte';
	import { onNavigate } from '$app/navigation';
	import { ClerkProvider } from 'svelte-clerk';

	let { children } = $props();

	// Enable View Transitions API
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		const fromPath = navigation.from?.url?.pathname;
		const toPath = navigation.to?.url?.pathname;
		const isHomeToProject = fromPath === '/' && toPath?.startsWith('/project');

		if (isHomeToProject) {
			document.documentElement.classList.add('vt-home-to-project');
		}

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				if (isHomeToProject) {
					document.documentElement.classList.remove('vt-home-to-project');
				}
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<ClerkProvider>
	<div class="font-body bg-charcoal text-cream flex h-screen">
		<LeftPanel />
		<div class="flex-1" style="view-transition-name: main-content">
			{@render children()}
		</div>
	</div>
</ClerkProvider>
