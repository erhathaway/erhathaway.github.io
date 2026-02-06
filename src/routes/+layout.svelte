<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import LeftPanel from '$lib/components/LeftPanel.svelte';
	import CategoryPills from '$lib/components/CategoryPills.svelte';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import AuthButton from '$lib/components/AuthButton.svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { onNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ClerkProvider } from 'svelte-clerk';
	import { onMount } from 'svelte';

	let { children } = $props();
	const isProjectPage = $derived($page.route.id?.includes('/project/'));
	const isAdminPage = $derived($page.route.id?.includes('/admin'));

	let appliedHoverId: number | null = null;
	let showLoginModal = $state(false);
	// Start with menu open on screens 768px and up, closed below
	let mobileMenuOpen = $state(true);
	let isMobileScreen = $state(false);

	onMount(() => {
		const handleResize = () => {
			const width = window.innerWidth;
			isMobileScreen = width < 768;
			// Auto-show/hide based on screen size when crossing the breakpoint
			if (width >= 768) {
				mobileMenuOpen = true;
			}
		};

		window.addEventListener('resize', handleResize);
		handleResize(); // Initial check

		const unsubscribe = page.subscribe(($page) => {
			const hoverId = $page.state?.hoverId as number | undefined;
			if (hoverId && hoverId !== appliedHoverId) {
				portfolio.lockHover(hoverId);
				appliedHoverId = hoverId;
			}
		});

		return () => {
			window.removeEventListener('resize', handleResize);
			unsubscribe();
		};
	});

	// Enable View Transitions API for home↔project navigation
	onNavigate((navigation) => {
		const fromPath = navigation.from?.url?.pathname;
		const toPath = navigation.to?.url?.pathname;
		const isHomeToProject = fromPath === '/' && toPath?.startsWith('/project');
		const isProjectToHome = fromPath?.startsWith('/project') && toPath === '/';
		const isProjectToProject = fromPath?.startsWith('/project') && toPath?.startsWith('/project');

		if (isProjectToProject) return;
		if (!isHomeToProject && !isProjectToHome) return;
		if (!document.startViewTransition) return;

		if (isHomeToProject) {
			document.documentElement.classList.add('vt-home-to-project');
		}

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				if (isHomeToProject) {
					document.documentElement.classList.remove('vt-home-to-project');
				}
				if (isProjectToHome && portfolio.hoverLockId !== null) {
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
	{#if isAdminPage}
		<div class="min-h-screen bg-cream text-walnut">
			{@render children()}
		</div>
		<AuthButton onOpenModal={() => showLoginModal = true} />
		<LoginModal bind:isOpen={showLoginModal} onClose={() => showLoginModal = false} />
	{:else}
		<div class="fixed inset-y-0 left-0 w-[12px] bg-white z-[200]" style="view-transition-name: left-bar"></div>

		<div class="font-body bg-charcoal text-cream h-screen flex ml-[12px]">
			<!-- Left spacer only on project pages on larger screens -->
			{#if isProjectPage}
				<div class="hidden sm:block w-80 shrink-0"></div>
			{/if}
			<!-- Main Content - full width for home/gallery, adjusted for project pages -->
			<div class="{isProjectPage ? 'flex-1' : 'w-full'} h-full overflow-auto" style="view-transition-name: main-content">
				{@render children()}
			</div>
		</div>
		<!-- Backdrop for mobile - non-blocking -->
		{#if isMobileScreen && mobileMenuOpen}
			<div class="fixed inset-0 z-[99] pointer-events-none bg-black/10"></div>
		{/if}
		<!-- Overlay panel for all screen sizes -->
		<div class="fixed inset-y-0 left-[12px] w-80 z-[100] transition-transform duration-300 {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0" style="view-transition-name: left-panel">
			<LeftPanel isMobile={isMobileScreen} onItemClick={() => {
				// Only close menu on mobile when clicking an item
				if (isMobileScreen) {
					mobileMenuOpen = false;
				}
			}} />
		</div>
		<div style="view-transition-name: auth-button">
			{#if !isProjectPage}
				<AuthButton onOpenModal={() => showLoginModal = true} />
			{/if}
		</div>
		<div class="fixed bottom-4 left-3/4 -translate-x-1/2 z-50 xl:bottom-4 max-xl:top-4 pointer-events-none" style="view-transition-name: social-links">
			<div class="px-5 py-3 bg-charcoal/40 backdrop-blur-md pointer-events-auto">
				<div class="flex gap-8 text-sm tracking-[0.18em] uppercase text-cream/60">
					<a href="https://github.com" class="hover:text-copper transition-colors">GitHub</a>
					<a href="https://instagram.com" class="hover:text-copper transition-colors">Instagram</a>
					<a href="mailto:contact@example.com" class="hover:text-copper transition-colors">Contact</a>
				</div>
			</div>
		</div>
		<div class="fixed bottom-6 left-20 right-0 flex justify-center z-40 pointer-events-none md:left-0" style="view-transition-name: bottom-bar">
			{#if isProjectPage}
				<a href="/" class="pointer-events-auto pill active inline-flex items-center gap-2 px-3 py-1.5 text-sm tracking-[0.2em] uppercase rounded-[3px] hover:opacity-80 transition-opacity" style="view-transition-name: category-back;" onclick={(event: MouseEvent) => {
					event.preventDefault();
					const projectId = $page.params?.id ? parseInt($page.params.id) : null;
					goto('/', projectId ? { state: { hoverId: projectId } } : undefined);
				}}>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back
				</a>
			{:else}
				<div class="pointer-events-auto">
					<CategoryPills />
				</div>
			{/if}
		</div>
		<LoginModal bind:isOpen={showLoginModal} onClose={() => showLoginModal = false} />
		<!-- Hamburger menu button - show below md (768px) - placed last to ensure it's on top -->
		{#if isMobileScreen}
			<button
				onclick={() => mobileMenuOpen = !mobileMenuOpen}
				class="fixed bottom-6 left-6 z-[9999] p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg"
			>
				<svg class="w-6 h-6 text-walnut" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					{#if mobileMenuOpen}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					{:else}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					{/if}
				</svg>
			</button>
		{/if}
	{/if}
</ClerkProvider>
