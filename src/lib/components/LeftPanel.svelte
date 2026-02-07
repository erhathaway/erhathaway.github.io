<script lang="ts">
  import CategoryPills from './CategoryPills.svelte';
  import ItemList from './ItemList.svelte';
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let {
    isMobile = false,
    onItemClick,
    onNameClick,
    hasTransitionNames = true,
    showNameCard = true,
    hoverInfoInWall = false,
    bottomAlignNav = false
  }: {
    isMobile?: boolean;
    onItemClick?: () => void;
    onNameClick?: () => void;
    hasTransitionNames?: boolean;
    showNameCard?: boolean;
    hoverInfoInWall?: boolean;
    bottomAlignNav?: boolean;
  } = $props();

  const isProjectPage = $derived($page.route.id?.includes('/project/'));
  const activeNamecardImage = $derived(isProjectPage ? portfolio.projectNamecardImage : portfolio.namecardImage);

  const activeProjectId = $derived.by(() => {
    const match = $page.url.pathname.match(/^\/project\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  });
  const currentIndex = $derived(activeProjectId !== null ? portfolio.filteredItems.findIndex(i => i.id === activeProjectId) : -1);
  const hasPrev = $derived(currentIndex > 0);
  const hasNext = $derived(currentIndex >= 0 && currentIndex < portfolio.filteredItems.length - 1);
  let navEl = $state<HTMLElement | null>(null);
  // View transitions temporarily hide the live DOM, which can cause CSS animations to restart
  // when it is revealed again. Disable the "entrance" animations after their first run.
  let slideInActive = $state(true);
  let slideUpActive = $state(true);

  function handleSlideInDone(e: AnimationEvent) {
    if (e.target !== e.currentTarget) return;
    if (e.animationName !== 'slideInLeft') return;
    slideInActive = false;
  }

  function handleSlideUpDone(e: AnimationEvent) {
    if (e.target !== e.currentTarget) return;
    if (e.animationName !== 'fadeSlideUp') return;
    slideUpActive = false;
  }

  onMount(() => {
    const timer = window.setTimeout(() => {
      slideInActive = false;
      slideUpActive = false;
    }, 1600);
    return () => window.clearTimeout(timer);
  });

  function storeNav(node: HTMLElement) {
    navEl = node;
    return () => {
      navEl = null;
    };
  }
</script>

<aside
  class="w-full h-full text-walnut flex flex-col relative {slideInActive ? 'animate-slide-in-left' : ''}"
  style="background: {isMobile
    ? 'linear-gradient(to right, #F5F1EB 0%, #F5F1EB 30%, rgba(245, 241, 235, 0.95) 50%, rgba(245, 241, 235, 0.8) 65%, rgba(245, 241, 235, 0.5) 80%, rgba(245, 241, 235, 0.2) 90%, transparent 100%)'
    : 'linear-gradient(to right, rgba(245, 241, 235, 0.9) 0%, rgba(245, 241, 235, 0.7) 15%, rgba(245, 241, 235, 0.4) 35%, rgba(245, 241, 235, 0.1) 60%, transparent 80%)'}"
  onanimationend={handleSlideInDone}
  onanimationcancel={handleSlideInDone}
>
  {#if showNameCard}
    {#if activeNamecardImage}
      <!-- Namecard image replaces gradient + text -->
      <div
        class="namecard-vt absolute top-0 left-0 {isProjectPage ? 'w-full' : 'w-[280px]'} h-[220px] overflow-hidden z-0 {isProjectPage ? 'rounded-b-xl' : ''}"
        style:view-transition-name={hasTransitionNames ? 'name-card-bg' : undefined}
      >
        <img
          src={activeNamecardImage.imageUrl}
          alt="Ethan Hathaway"
          class="w-full h-full object-cover"
          style:object-position="{activeNamecardImage.positionX}% {activeNamecardImage.positionY}%"
          style:transform="scale({activeNamecardImage.zoom})"
          style:transform-origin="{activeNamecardImage.positionX}% {activeNamecardImage.positionY}%"
          draggable="false"
        />
      </div>
      <!-- Spacer to match the flow-space the header text would occupy -->
      <div class="h-[130px] shrink-0"></div>
    {:else}
      <!-- Background rectangle behind name and tagline -->
      <div
        class="namecard-vt absolute top-0 left-0 {isProjectPage ? 'w-full' : 'w-[280px]'} h-[220px] border backdrop-blur-md z-0"
        style="border-color: rgba(138,128,120,0.15); background: radial-gradient(circle at bottom right, rgba(253,218,130,0.3), rgba(255,255,255,0.1) 60%, rgba(255,255,255,0.1));"
        style:view-transition-name={hasTransitionNames ? 'name-card-bg' : undefined}
      ></div>

      <!-- Fixed Header - Always on top -->
      <div class="p-8 pt-10 pb-0 z-30 relative bg-transparent">
        <span
          class="namecard-vt text-[38px] font-normal text-walnut no-underline leading-[1.2] mb-3 block {slideUpActive ? 'animate-slide-up' : ''}"
          style="animation-delay: 0.1s; font-family: 'Playfair Display', Georgia, serif;"
          style:view-transition-name={hasTransitionNames ? 'name-text' : undefined}
        >
          Ethan<br>Hathaway
        </span>
      </div>
    {/if}
  {/if}

  <!-- Main Content Area -->
  <div class="flex-1 flex flex-col p-8 relative z-0 min-h-0 {showNameCard ? 'pt-4' : ''}">
    {#if showNameCard && !activeNamecardImage}
      <p
        class="namecard-vt text-[11px] tracking-[0.32em] uppercase text-ash/80 {slideUpActive ? 'animate-slide-up' : ''}"
        style="animation-delay: 0.2s;"
        style:view-transition-name={hasTransitionNames ? 'subtitle-text' : undefined}
      >
        Things I Make
      </p>
    {/if}

    <!-- Scrollable Navigation Area -->
    <nav
      class="flex-1 overflow-y-auto {slideUpActive ? 'animate-slide-up' : ''} min-h-0 max-h-full scrollbar-hide -mx-8 {bottomAlignNav ? 'flex flex-col justify-end pb-10 pt-0 mt-0' : showNameCard ? 'pt-12 mt-16 pb-[50%]' : 'pt-8 mt-8 pb-[50%]'}"
      style="animation-delay: 0.4s"
      onanimationend={handleSlideUpDone}
      onanimationcancel={handleSlideUpDone}
      {@attach storeNav}
    >
      <ItemList scrollContainer={navEl} onItemClick={onItemClick} hoverInfoInWall={hoverInfoInWall} />

      <!-- Admin Link (scrolls with content) -->
    </nav>

    {#if isProjectPage && currentIndex >= 0}
      <div class="flex items-center gap-3 px-8 pb-2 pt-3 shrink-0">
        <button
          type="button"
          class="p-1.5 rounded-lg transition-colors duration-150 {hasPrev ? 'text-ash hover:text-copper cursor-pointer' : 'text-ash/20 cursor-default'}"
          disabled={!hasPrev}
          onclick={() => hasPrev && goto(`/project/${portfolio.filteredItems[currentIndex - 1].id}`)}
          aria-label="Previous project"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span class="text-[10px] tracking-widest uppercase text-ash/40">{currentIndex + 1} / {portfolio.filteredItems.length}</span>
        <button
          type="button"
          class="p-1.5 rounded-lg transition-colors duration-150 {hasNext ? 'text-ash hover:text-copper cursor-pointer' : 'text-ash/20 cursor-default'}"
          disabled={!hasNext}
          onclick={() => hasNext && goto(`/project/${portfolio.filteredItems[currentIndex + 1].id}`)}
          aria-label="Next project"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    {/if}
  </div>
</aside>
