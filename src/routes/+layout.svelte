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
	import { onMount, tick } from 'svelte';

	let { children } = $props();
	const isProjectPage = $derived($page.route.id?.includes('/project/'));
	const isAdminPage = $derived($page.route.id?.includes('/admin'));

	let appliedHoverId: number | null = null;
	let showLoginModal = $state(false);
	// Start with menu open on screens 768px and up, closed below
	let mobileMenuOpen = $state(true);
	let isMobileScreen = $state(false);
	let nameCardExpanded = $state(false);
	// Separate flag controls when LeftPanel/social-links get their view-transition-names.
	// During collapse we must destroy the modal FIRST (removing its names) before
	// LeftPanel re-adds the same names — otherwise duplicate names cause InvalidStateError.
	let panelTransitionNames = $state(true);

	function expandNameCard() {
		if (!document.startViewTransition) {
			nameCardExpanded = true;
			panelTransitionNames = false;
			return;
		}
		const t = document.startViewTransition(async () => {
			panelTransitionNames = false; // remove names from LeftPanel first
			await tick();
			nameCardExpanded = true;      // create modal with those names
			await tick();
		});
		// Prevent unhandled ViewTransition rejections from triggering SvelteKit error recovery
		t.finished.catch(() => {});
	}

	function collapseNameCard() {
		if (!document.startViewTransition) {
			nameCardExpanded = false;
			panelTransitionNames = true;
			return;
		}
		const t = document.startViewTransition(async () => {
			nameCardExpanded = false;     // destroy modal first (removes names)
			await tick();
			panelTransitionNames = true;  // add names back to LeftPanel
			await tick();
		});
		// Prevent unhandled ViewTransition rejections from triggering SvelteKit error recovery
		t.finished.catch(() => {});
	}

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

<svelte:window onkeydown={(e: KeyboardEvent) => { if (e.key === 'Escape' && nameCardExpanded) collapseNameCard(); }} />
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
			<LeftPanel isMobile={isMobileScreen} onNameClick={expandNameCard} hasTransitionNames={panelTransitionNames} onItemClick={() => {
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
		{#if panelTransitionNames}
			<div class="fixed bottom-4 left-3/4 -translate-x-1/2 z-50 xl:bottom-4 max-xl:top-4 pointer-events-none" style="view-transition-name: social-links">
				<div class="px-5 py-3 bg-charcoal/40 backdrop-blur-md pointer-events-auto">
					<div class="flex gap-8 text-sm tracking-[0.18em] uppercase text-cream/60">
						<a href="https://github.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors" style="view-transition-name: social-link-github">GitHub</a>
						<a href="https://instagram.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors" style="view-transition-name: social-link-instagram">Instagram</a>
						<a href="mailto:erhathaway@gmail.com" class="hover:text-copper transition-colors" style="view-transition-name: social-link-contact">Contact</a>
					</div>
				</div>
			</div>
		{/if}
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
		<!-- Expanded name card modal -->
		{#if nameCardExpanded}
			<div class="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
				<!-- Backdrop -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div class="absolute inset-0 bg-white/85 backdrop-blur-sm" style="view-transition-name: name-card-backdrop" onclick={collapseNameCard}></div>
				<!-- Card background that morphs from the left panel card -->
				<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
					<div class="w-[min(500px,90vw)] pointer-events-auto rounded-sm" style="view-transition-name: name-card-bg; background: radial-gradient(circle at bottom right, rgba(253,218,130,0.3), rgba(255,255,255,0.1) 60%, rgba(255,255,255,0.1)); border: 1px solid rgba(138,128,120,0.15); backdrop-filter: blur(12px);">
						<div class="p-10 pt-12 pb-8 flex flex-col items-center text-center">
							<span class="text-[48px] font-normal text-walnut leading-[1.2] mb-4 block" style="font-family: 'Playfair Display', Georgia, serif; view-transition-name: name-text">
								Ethan<br>Hathaway
							</span>
							<p class="text-[11px] tracking-[0.32em] uppercase text-ash/80 mb-10" style="view-transition-name: subtitle-text">
								Things I Make
							</p>
							<div class="flex flex-col gap-4 text-sm tracking-[0.18em] uppercase text-walnut/60">
								<a href="https://github.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors" style="view-transition-name: social-link-github">GitHub</a>
								<a href="https://instagram.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors" style="view-transition-name: social-link-instagram">Instagram</a>
								<a href="mailto:erhathaway@gmail.com" class="hover:text-copper transition-colors" style="view-transition-name: social-link-contact">Contact</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
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
