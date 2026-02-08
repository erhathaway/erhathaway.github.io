<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import LeftPanel from '$lib/components/LeftPanel.svelte';
	import CategoryPills from '$lib/components/CategoryPills.svelte';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import AuthButton from '$lib/components/AuthButton.svelte';
	import PostHogIdentify from '$lib/components/PostHogIdentify.svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { onNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ClerkProvider } from 'svelte-clerk';
	import { onMount, tick } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { initPostHog } from '$lib/posthog';

	let { children } = $props();
	const isProjectPage = $derived($page.route.id === '/[slug]');
	const isAdminPage = $derived($page.route.id?.includes('/admin'));
	const isHomePage = $derived($page.url.pathname === '/');
	const isErrorPage = $derived(!!$page.error);

	let appliedHoverId: number | null = null;
	let showLoginModal = $state(false);
	// Start closed; resize handler on mount will open it if screen is wide enough
	let mobileMenuOpen = $state(false);
	let isMobileScreen = $state(false);
	let nameCardExpanded = $state(false);
	// Separate flag controls when LeftPanel/social-links get their view-transition-names.
	// During collapse we must destroy the modal FIRST (removing its names) before
	// LeftPanel re-adds the same names — otherwise duplicate names cause InvalidStateError.
	let panelTransitionNames = $state(true);

	const homeNamecardInGallery = (() => {
		const raw = env.PUBLIC_HOME_NAMECARD_IN_GALLERY;
		const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
		return value === '1' || value === 'true' || value === 'yes' || value === 'on';
	})();
	const stickyBottomUiEnabled = (() => {
		const raw = env.PUBLIC_STICKY_BOTTOM_UI;
		const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
		return value === '1' || value === 'true' || value === 'yes' || value === 'on';
	})();
	const homeCardMode = $derived(isHomePage && homeNamecardInGallery);
	const showLeftPanelNameCard = $derived(isProjectPage || !homeNamecardInGallery);
	const NAME_CARD_TRIGGER_NAMES_OFF_CLASS = 'namecard-trigger-names-off';

	function setPanelTransitionNames(active: boolean) {
		panelTransitionNames = active;
		if (typeof document === 'undefined') return;
		document.documentElement.classList.toggle(NAME_CARD_TRIGGER_NAMES_OFF_CLASS, !active);
	}

	type NameCardCloseMaskPhase = 'hidden' | 'visible' | 'fading';
	let nameCardCloseMaskPhase = $state<NameCardCloseMaskPhase>('hidden');
	let nameCardCloseMaskTimer: ReturnType<typeof setTimeout> | null = null;
	let nameCardViewTransitionScopes = 0;
	const NAME_CARD_CLOSE_MASK_FADE_MS = 120;

	function swallowViewTransitionErrors(t: ViewTransition) {
		// Different engines/polyfills may omit some promises (notably `updateCallbackDone`).
		// Use optional chaining to avoid throwing while trying to swallow errors.
		try {
			(t as any).ready?.catch?.(() => {});
			(t as any).updateCallbackDone?.catch?.(() => {});
			(t as any).finished?.catch?.(() => {});
		} catch {
			// ignore
		}
	}

	function acquireNameCardViewTransitionScope() {
		nameCardViewTransitionScopes += 1;
		if (nameCardViewTransitionScopes === 1) {
			document.documentElement.classList.add('vt-namecard');
		}

		let released = false;
		return () => {
			if (released) return;
			released = true;

			nameCardViewTransitionScopes -= 1;
			if (nameCardViewTransitionScopes <= 0) {
				nameCardViewTransitionScopes = 0;
				document.documentElement.classList.remove('vt-namecard');
			}
		};
	}

	function showNameCardCloseMask() {
		if (nameCardCloseMaskTimer) {
			window.clearTimeout(nameCardCloseMaskTimer);
			nameCardCloseMaskTimer = null;
		}
		nameCardCloseMaskPhase = 'visible';
	}

	function fadeOutNameCardCloseMask() {
		if (nameCardCloseMaskPhase === 'hidden') return;
		nameCardCloseMaskPhase = 'fading';
		if (nameCardCloseMaskTimer) {
			window.clearTimeout(nameCardCloseMaskTimer);
		}
		nameCardCloseMaskTimer = window.setTimeout(() => {
			nameCardCloseMaskPhase = 'hidden';
			nameCardCloseMaskTimer = null;
		}, NAME_CARD_CLOSE_MASK_FADE_MS);
	}

	function beginHoverSuppression() {
		if (typeof window === 'undefined') return;
		portfolio.setHoverUpdatesSuppressed(true);
		document.documentElement.classList.add('vt-suppress-hover');

		let released = false;
		const release = () => {
			if (released) return;
			released = true;
			portfolio.setHoverUpdatesSuppressed(false);
			document.documentElement.classList.remove('vt-suppress-hover');
		};

		return release;
	}

	function armHoverSuppressionRelease(release: (() => void) | undefined) {
		if (typeof window === 'undefined') return;
		if (!release) return;
		window.addEventListener('pointermove', release, { once: true });
		window.addEventListener('pointerdown', release, { once: true });
		window.addEventListener('keydown', release, { once: true });
		window.setTimeout(release, 1200);
	}

	function expandNameCard() {
		if (!document.startViewTransition) {
			nameCardExpanded = true;
			setPanelTransitionNames(false);
			return;
		}

		const releaseNameCardScope = acquireNameCardViewTransitionScope();
		const scopeTimeout = window.setTimeout(releaseNameCardScope, 2000);
		try {
			const t = document.startViewTransition(async () => {
				try {
					setPanelTransitionNames(false); // remove names from LeftPanel first
					await tick();
					nameCardExpanded = true; // create modal with those names
					await tick();
				} catch {
					// If anything goes wrong mid-update, land in the intended end state.
					setPanelTransitionNames(false);
					nameCardExpanded = true;
				}
			});
			// Prevent ViewTransition promise rejections from triggering SvelteKit error recovery
			swallowViewTransitionErrors(t);
			const finished = (t as any).finished;
			if (finished && typeof finished.then === 'function') {
				finished.then(
					() => { window.clearTimeout(scopeTimeout); releaseNameCardScope(); },
					() => { window.clearTimeout(scopeTimeout); releaseNameCardScope(); }
				);
			}
		} catch {
			// If a transition is already running (InvalidStateError), fall back to an instant state update.
			window.clearTimeout(scopeTimeout);
			releaseNameCardScope();
			setPanelTransitionNames(false);
			nameCardExpanded = true;
		}
	}

	function collapseNameCard() {
		// When the ViewTransition finishes, the live DOM is revealed under the current pointer
		// position. That can fire immediate `mouseenter` handlers (gallery hover) and cause the
		// page to "jump" right as the transition ends.
		//
		// 1) Suppress hover state and CSS hover effects until the user shows intent again.
		// 2) Keep a real DOM backdrop briefly after the VT ends to mask the snapshot→live swap.
		const releaseHoverSuppression = beginHoverSuppression();
		showNameCardCloseMask();

		if (!document.startViewTransition) {
			nameCardExpanded = false;
			setPanelTransitionNames(true);
			armHoverSuppressionRelease(releaseHoverSuppression);
			requestAnimationFrame(fadeOutNameCardCloseMask);
			return;
		}

		const releaseNameCardScope = acquireNameCardViewTransitionScope();
		const scopeTimeout = window.setTimeout(releaseNameCardScope, 2000);
		try {
			const t = document.startViewTransition(async () => {
				try {
					nameCardExpanded = false; // destroy modal first (removes names)
					await tick();
					setPanelTransitionNames(true); // add names back to LeftPanel
					await tick();
				} catch {
					// If anything goes wrong mid-update, land in the intended end state.
					nameCardExpanded = false;
					setPanelTransitionNames(true);
				}
			});
			// Prevent ViewTransition promise rejections from triggering SvelteKit error recovery
			swallowViewTransitionErrors(t);
			const finished = (t as any).finished;
			if (finished && typeof finished.then === 'function') {
				finished.then(
					() => {
						window.clearTimeout(scopeTimeout);
						releaseNameCardScope();
						// Let the UA do the final swap before we fade the real DOM mask.
						requestAnimationFrame(() => {
							armHoverSuppressionRelease(releaseHoverSuppression);
							fadeOutNameCardCloseMask();
						});
					},
					() => {
						window.clearTimeout(scopeTimeout);
						releaseNameCardScope();
						requestAnimationFrame(() => {
							armHoverSuppressionRelease(releaseHoverSuppression);
							fadeOutNameCardCloseMask();
						});
					}
				);
			} else {
				window.clearTimeout(scopeTimeout);
				releaseNameCardScope();
				requestAnimationFrame(() => {
					armHoverSuppressionRelease(releaseHoverSuppression);
					fadeOutNameCardCloseMask();
				});
			}
		} catch {
			// If a transition is already running (InvalidStateError), fall back to an instant state update.
			window.clearTimeout(scopeTimeout);
			releaseNameCardScope();
			nameCardExpanded = false;
			setPanelTransitionNames(true);
			armHoverSuppressionRelease(releaseHoverSuppression);
			requestAnimationFrame(fadeOutNameCardCloseMask);
		}
	}

	onMount(() => {
		initPostHog(env.PUBLIC_POSTHOG_KEY ?? '');

		// Ensure the trigger-name suppression class matches initial state on first paint/hydration.
		setPanelTransitionNames(panelTransitionNames);

		const handleResize = () => {
			const width = window.innerWidth;
			isMobileScreen = width < 1024;
			// Auto-show/hide based on screen size when crossing the breakpoint
			mobileMenuOpen = width >= 1024;
		};

		window.addEventListener('resize', handleResize);
		handleResize(); // Initial check

		const handleNameCardOpen = () => {
			expandNameCard();
		};
		window.addEventListener('namecard:open', handleNameCardOpen);

		const handleAuthOpen = () => { showLoginModal = true; };
		window.addEventListener('auth:open-login', handleAuthOpen);

		const unsubscribe = page.subscribe(($page) => {
			const hoverId = $page.state?.hoverId as number | undefined;
			if (hoverId && hoverId !== appliedHoverId) {
				portfolio.lockHover(hoverId);
				appliedHoverId = hoverId;
			}
		});

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('namecard:open', handleNameCardOpen);
			window.removeEventListener('auth:open-login', handleAuthOpen);
			unsubscribe();
		};
	});

	// Enable View Transitions API for home↔project navigation
	onNavigate((navigation) => {
		const fromRoute = navigation.from?.route?.id;
		const toRoute = navigation.to?.route?.id;
		const isHomeToProject = fromRoute === '/(home)' && toRoute === '/[slug]';
		const isProjectToHome = fromRoute === '/[slug]' && toRoute === '/(home)';
		const isProjectToProject = fromRoute === '/[slug]' && toRoute === '/[slug]';
		const HOME_RIGHT_PANEL_SCROLL_TOP_KEY = 'portfolio:homeRightPanelScrollTop';

		const getHomeRightPanel = (): HTMLElement | null => {
			try {
				return document.querySelector<HTMLElement>('.right-panel');
			} catch {
				return null;
			}
		};

		const saveHomeRightPanelScrollTop = () => {
			const el = getHomeRightPanel();
			if (!el) return;
			try {
				sessionStorage.setItem(HOME_RIGHT_PANEL_SCROLL_TOP_KEY, String(el.scrollTop));
			} catch {
				// ignore
			}
		};

		const readHomeRightPanelScrollTop = (): number | null => {
			try {
				const raw = sessionStorage.getItem(HOME_RIGHT_PANEL_SCROLL_TOP_KEY);
				if (!raw) return null;
				const value = Number.parseFloat(raw);
				if (!Number.isFinite(value)) return null;
				return value;
			} catch {
				return null;
			}
		};

		const restoreHomeRightPanelScrollTop = async () => {
			const target = readHomeRightPanelScrollTop();
			if (target === null) return;

			for (let i = 0; i < 10; i += 1) {
				const el = getHomeRightPanel();
				if (el) {
					el.scrollTop = target;
					return;
				}
				await new Promise<void>((r) => requestAnimationFrame(() => r()));
			}
		};

		if (isProjectToProject) return;
		if (!isHomeToProject && !isProjectToHome) return;

		if (isHomeToProject) {
			// Remember gallery scroll so project→home can restore it.
			saveHomeRightPanelScrollTop();
		}

		if (isProjectToHome && !document.startViewTransition) {
			// No View Transitions API: restore after navigation completes.
			navigation.complete
				.then(async () => {
					await restoreHomeRightPanelScrollTop();
				})
				.catch(() => {});
		}

		if (!document.startViewTransition) return;

		const HOME_PROJECT_NAV_CLASS = 'vt-home-project-nav';
		document.documentElement.classList.add(HOME_PROJECT_NAV_CLASS);

		if (isHomeToProject) {
			document.documentElement.classList.add('vt-home-to-project');
		}

		return new Promise((resolve) => {
			let resolved = false;
			const resolveOnce = () => {
				if (resolved) return;
				resolved = true;
				resolve();
			};

			try {
				const t = document.startViewTransition(async () => {
					try {
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
					} finally {
						resolveOnce();
					}
					try {
						await navigation.complete;
					} catch {
						// ignore aborted navigations; we already resolved the hook
					}

					if (isProjectToHome) {
						// Ensure the ViewTransition captures the restored scroll position.
						await restoreHomeRightPanelScrollTop();
					}
				});

				// Prevent ViewTransition promise rejections from triggering SvelteKit error recovery
				swallowViewTransitionErrors(t);
				const finished = (t as any).finished;
				if (finished && typeof finished.then === 'function') {
					finished.then(
						() => document.documentElement.classList.remove(HOME_PROJECT_NAV_CLASS),
						() => document.documentElement.classList.remove(HOME_PROJECT_NAV_CLASS)
					);
				} else {
					window.setTimeout(() => {
						document.documentElement.classList.remove(HOME_PROJECT_NAV_CLASS);
					}, 1200);
				}
			} catch {
				document.documentElement.classList.remove(HOME_PROJECT_NAV_CLASS);
				if (isHomeToProject) {
					document.documentElement.classList.remove('vt-home-to-project');
				}
				resolveOnce();
			}
		});
	});
</script>

<svelte:window onkeydown={(e: KeyboardEvent) => { if (e.key === 'Escape' && nameCardExpanded) collapseNameCard(); }} />
<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<ClerkProvider>
	<PostHogIdentify />
	{#if isAdminPage}
		<div class="min-h-screen bg-cream text-walnut">
			{@render children()}
		</div>
		<AuthButton onOpenModal={() => showLoginModal = true} />
		<LoginModal bind:isOpen={showLoginModal} onClose={() => showLoginModal = false} />
	{:else}
		{#if !isHomePage && !isErrorPage}
			<div class="fixed inset-y-0 left-0 w-[12px] bg-white z-[200] vt-exclude-namecard" style="view-transition-name: left-bar"></div>
		{/if}

		<div class="font-body bg-charcoal text-cream h-screen flex {isHomePage || isErrorPage ? '' : 'ml-[12px]'}">
			<!-- Left spacer only on project pages on larger screens -->
			{#if isProjectPage && !isErrorPage}
				<div class="hidden lg:block w-80 shrink-0"></div>
			{/if}
			<!-- Main Content - full width for home/gallery, adjusted for project pages -->
			<div class="{isProjectPage && !isErrorPage ? 'flex-1' : 'w-full'} h-full {isHomePage ? 'overflow-hidden' : 'overflow-auto'} vt-exclude-namecard" style="view-transition-name: main-content">
				{@render children()}
			</div>
		</div>
		<!-- Backdrop for mobile - non-blocking -->
		{#if isMobileScreen && mobileMenuOpen && !isErrorPage}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="fixed inset-0 z-[99] bg-black/10" onclick={() => mobileMenuOpen = false}></div>
		{/if}
		<!-- Overlay panel for all screen sizes -->
		{#if !isHomePage && !isErrorPage}
			<div class="fixed inset-y-0 left-[12px] w-80 z-[100] transition-transform duration-300 {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 vt-exclude-namecard" style="view-transition-name: left-panel">
				<LeftPanel isMobile={isMobileScreen} onNameClick={expandNameCard} hasTransitionNames={panelTransitionNames} showNameCard={showLeftPanelNameCard} onItemClick={() => {
					// Only close menu on mobile when clicking an item
					if (isMobileScreen) {
						mobileMenuOpen = false;
					}
				}} hoverInfoInWall={homeCardMode} bottomAlignNav={homeCardMode} />
			</div>
		{/if}
		<div class="vt-exclude-namecard" style="view-transition-name: auth-button">
		</div>
		{#if stickyBottomUiEnabled && panelTransitionNames && !isErrorPage}
			<div class="fixed bottom-4 left-3/4 -translate-x-1/2 z-50 xl:bottom-4 max-xl:top-4 pointer-events-none vt-exclude-namecard" style="view-transition-name: social-links">
				<div class="px-5 py-3 bg-charcoal/40 backdrop-blur-md pointer-events-auto">
					<div class="flex gap-8 text-sm tracking-[0.18em] uppercase text-cream/60">
						<a href="https://github.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors" style="view-transition-name: social-link-github">GitHub</a>
						<a href="https://instagram.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors" style="view-transition-name: social-link-instagram">Instagram</a>
						<a href="mailto:erhathaway@gmail.com" class="hover:text-copper transition-colors" style="view-transition-name: social-link-contact">Contact</a>
					</div>
				</div>
			</div>
		{/if}
		{#if stickyBottomUiEnabled && !isErrorPage}
			<div class="fixed bottom-6 left-20 right-0 flex justify-center z-40 pointer-events-none lg:left-0 vt-exclude-namecard" style="view-transition-name: bottom-bar">
				{#if isProjectPage}
					<a href="/" class="pointer-events-auto pill active inline-flex items-center gap-2 px-3 py-1.5 text-sm tracking-[0.2em] uppercase rounded-[1px] hover:opacity-80 transition-opacity" style="view-transition-name: category-back;" onclick={(event: MouseEvent) => {
						event.preventDefault();
						const slug = $page.params?.slug;
						const projectItem = slug ? portfolio.allItems.find(i => i.slug === slug) : null;
						goto('/', projectItem ? { state: { hoverId: projectItem.id } } : undefined);
					}}>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
						Back
					</a>
				{:else}
					<div class="pointer-events-auto rounded-[1px] {homeCardMode ? 'px-0 py-0 bg-cream/85 backdrop-blur-md' : ''}">
						<CategoryPills cardMode={homeCardMode} />
					</div>
				{/if}
			</div>
		{/if}
		{#if nameCardCloseMaskPhase !== 'hidden'}
			<div
				class="fixed inset-0 z-[297] pointer-events-none bg-white/85 backdrop-blur-sm transition-opacity duration-[120ms]"
				class:opacity-0={nameCardCloseMaskPhase === 'fading'}
				aria-hidden="true"
			></div>
		{/if}
		<!-- Expanded name card modal -->
		{#if nameCardExpanded}
			<div class="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
				<!-- Backdrop -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div class="absolute inset-0 bg-white/85 backdrop-blur-sm" style="view-transition-name: name-card-backdrop" onclick={collapseNameCard}></div>
				<!-- Card background that morphs from the left panel card -->
				<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
					{#if portfolio.namecardImage}
						<div class="relative w-[min(500px,90vw)] pointer-events-auto rounded-sm overflow-hidden" style="view-transition-name: name-card-bg;">
							<img
								src={portfolio.namecardImage.imageUrl}
								alt="Ethan Hathaway"
								class="w-full aspect-square object-cover"
								style:object-position="{portfolio.namecardImage.positionX}% {portfolio.namecardImage.positionY}%"
								style:transform="scale({portfolio.namecardImage.zoom})"
								style:transform-origin="{portfolio.namecardImage.positionX}% {portfolio.namecardImage.positionY}%"
								draggable="false"
							/>
							<div class="absolute inset-x-0 bottom-0 p-6 flex justify-center">
								<div class="flex gap-8 text-sm tracking-[0.18em] uppercase text-walnut/60">
									<a href="https://github.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors" style="view-transition-name: social-link-github">GitHub</a>
									<a href="https://instagram.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors" style="view-transition-name: social-link-instagram">Instagram</a>
									<a href="mailto:erhathaway@gmail.com" class="hover:text-copper transition-colors" style="view-transition-name: social-link-contact">Contact</a>
								</div>
							</div>
						</div>
					{:else}
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
					{/if}
				</div>
			</div>
		{/if}
		<LoginModal bind:isOpen={showLoginModal} onClose={() => showLoginModal = false} />
		<!-- Hamburger menu button - show below md (768px) - placed last to ensure it's on top -->
		{#if isMobileScreen && !isErrorPage && !isHomePage}
			<button
				onclick={() => mobileMenuOpen = !mobileMenuOpen}
				class="fixed bottom-6 left-6 z-[9999] p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg"
				aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
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
