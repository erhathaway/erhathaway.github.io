<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import LeftPanel from '$lib/components/LeftPanel.svelte';
	import CategoryPills from '$lib/components/CategoryPills.svelte';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import AuthButton from '$lib/components/AuthButton.svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { ClerkProvider } from 'svelte-clerk';

	let { children } = $props();
	const isProjectPage = $derived($page.route.id?.includes('/project/'));
	const isAdminPage = $derived($page.route.id?.includes('/admin'));
	const hoverFromState = $derived($page.state?.hoverId as number | undefined);

	let appliedHoverId = $state<number | null>(null);
	let showLoginModal = $state(false);
	// Start with menu open on screens 400-1024px, closed below 400px
	let mobileMenuOpen = $state(typeof window !== 'undefined' && window.innerWidth >= 400 && window.innerWidth < 1024);
	$effect(() => {
		if (hoverFromState && hoverFromState !== appliedHoverId) {
			portfolio.lockHover(hoverFromState);
			appliedHoverId = hoverFromState;
		}
	});

	// Enable View Transitions API
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		const fromPath = navigation.from?.url?.pathname;
		const toPath = navigation.to?.url?.pathname;
		const isHomeToProject = fromPath === '/' && toPath?.startsWith('/project');
		const isProjectToProject = fromPath?.startsWith('/project') && toPath?.startsWith('/project');

		if (isProjectToProject) {
			return;
		}

		if (isHomeToProject) {
			document.documentElement.classList.add('vt-home-to-project');
		}

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				if (isHomeToProject) {
					document.documentElement.classList.remove('vt-home-to-project');
				}
				if (fromPath?.startsWith('/project') && toPath === '/' && portfolio.hoverLockId !== null) {
					const lockId = portfolio.hoverLockId;
					setTimeout(() => {
						if (portfolio.hoverLockId === lockId && portfolio.hoveredItemId === lockId) {
							portfolio.hoveredItemId = null;
							portfolio.hoverLockId = null;
						}
					}, 650);
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
			<!-- Left Panel - normal flow on lg (1024px) and up -->
			<div class="w-80 min-w-[320px] hidden lg:block">
				<LeftPanel />
			</div>
			<!-- Main Content - always full width below lg, flex-1 above -->
			<div class="flex-1 lg:flex-1 max-lg:w-full h-full overflow-auto" style="view-transition-name: main-content">
				{@render children()}
			</div>
		</div>
		<!-- Overlay panel for screens below lg (1024px) -->
		<div class="lg:hidden fixed inset-y-0 left-0 w-80 z-[100] max-[400px]:transition-transform max-[400px]:duration-300 {mobileMenuOpen ? '' : 'max-[400px]:-translate-x-full'}">
			<LeftPanel bind:isOpen={mobileMenuOpen} />
		</div>
		<!-- Hamburger menu button - only show below 400px -->
		<button
			onclick={() => mobileMenuOpen = !mobileMenuOpen}
			class="min-[400px]:hidden fixed bottom-6 left-6 z-[110] p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg"
		>
			<svg class="w-6 h-6 text-walnut" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				{#if mobileMenuOpen}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				{:else}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				{/if}
			</svg>
		</button>
	<AuthButton onOpenModal={() => showLoginModal = true} />
	{#if !isAdminPage}
		<div class="fixed bottom-4 right-4 z-50 xl:bottom-4 xl:right-4 max-xl:top-4 max-xl:left-1/2 max-xl:-translate-x-1/2 pointer-events-none">
			<div class="px-5 py-3 bg-charcoal/40 backdrop-blur-md pointer-events-auto">
				<div class="flex gap-8 text-sm tracking-[0.18em] uppercase text-cream/60">
					<a href="https://github.com" class="hover:text-copper transition-colors">GitHub</a>
					<a href="https://instagram.com" class="hover:text-copper transition-colors">Instagram</a>
					<a href="mailto:contact@example.com" class="hover:text-copper transition-colors">Contact</a>
				</div>
			</div>
		</div>
	{/if}
	{#if !isProjectPage && !isAdminPage}
		<div class="fixed bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
			<div class="pointer-events-auto animate-slide-up" style="animation-delay: 0.3s">
				<CategoryPills />
			</div>
		</div>
	{/if}
	<LoginModal bind:isOpen={showLoginModal} onClose={() => showLoginModal = false} />
</ClerkProvider>
