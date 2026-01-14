<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import LeftPanel from '$lib/components/LeftPanel.svelte';
	import CategoryPills from '$lib/components/CategoryPills.svelte';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { ClerkProvider } from 'svelte-clerk';

	let { children } = $props();
	const isProjectPage = $derived($page.route.id?.includes('/project/'));

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
	<a href="/admin" class="fixed top-4 right-4 text-[11px] tracking-[0.22em] uppercase text-ash/70 hover:text-copper transition-colors z-50">
		Admin
	</a>
	<div class="fixed bottom-4 right-4 z-50">
		<div class="px-4 py-2 bg-charcoal/40 backdrop-blur-md">
			<div class="flex gap-6 text-[11px] tracking-[0.18em] uppercase text-cream/60">
				<a href="https://github.com" class="hover:text-copper transition-colors">GitHub</a>
				<a href="https://instagram.com" class="hover:text-copper transition-colors">Instagram</a>
				<a href="mailto:contact@example.com" class="hover:text-copper transition-colors">Contact</a>
			</div>
		</div>
	</div>
	{#if !isProjectPage}
		<div class="fixed bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
			<div class="pointer-events-auto animate-slide-up" style="animation-delay: 0.3s">
				<CategoryPills />
			</div>
		</div>
	{/if}
</ClerkProvider>
