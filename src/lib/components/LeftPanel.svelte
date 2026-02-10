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

  const isProjectPage = $derived($page.route.id === '/[slug]');
  const activeNamecardImage = $derived(isProjectPage ? portfolio.projectNamecardImage : portfolio.namecardImage);

  const activeSlug = $derived($page.params.slug ?? null);
  const currentIndex = $derived(activeSlug !== null ? portfolio.filteredItems.findIndex(i => i.slug === activeSlug) : -1);
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
  class="w-full h-full text-walnut flex flex-col relative overflow-visible {slideInActive ? 'animate-slide-in-left' : ''}"
  onanimationend={handleSlideInDone}
  onanimationcancel={handleSlideInDone}
>
  {#if isProjectPage}
    <div class="w-full h-3 shrink-0 relative z-30" style="background: #fcfbfa;"></div>
  {/if}

  {#if showNameCard}
    {#if activeNamecardImage}
      <!-- Namecard image replaces gradient + text -->
      <button
        type="button"
        class="namecard-vt absolute {isProjectPage ? 'top-3' : 'top-0'} left-0 {isProjectPage ? 'w-full' : 'w-[280px]'} h-[220px] overflow-hidden z-20 cursor-pointer"
        style:view-transition-name={hasTransitionNames ? 'name-card-bg' : undefined}
        onclick={() => isProjectPage ? goto('/') : onNameClick?.()}
        aria-label="Go home"
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
      </button>
      <!-- Spacer to match the flow-space the header text would occupy -->
      <div
        class="h-[130px] shrink-0 cursor-pointer"
        onclick={() => isProjectPage ? goto('/') : onNameClick?.()}
        role="button"
        tabindex="-1"
      ></div>
    {:else}
      <!-- Fixed Header - Always on top -->
      <div
        class="namecard-vt relative {isProjectPage ? '' : 'w-[280px]'} border z-30 cursor-pointer"
        style="border-color: rgba(138,128,120,0.15); background-color: #fae6d0;"
        style:view-transition-name={hasTransitionNames ? 'name-card-bg' : undefined}
      >
        {#if isProjectPage}
          <div class="absolute -top-2.5 -bottom-4 z-30" style="left: -1px; width: 2px; background: linear-gradient(to bottom, rgba(0,0,0,0.08) 15%, rgba(0,0,0,0.02) 15%, rgba(0,0,0,0.02) 85%, rgba(0,0,0,0.08) 85%);"></div>
        {/if}
        <button
          type="button"
          class="p-8 pt-10 pb-0 relative bg-transparent cursor-pointer text-left w-full"
          onclick={() => isProjectPage ? goto('/') : onNameClick?.()}
          aria-label="Go home"
        >
          <span
            class="namecard-vt text-[38px] font-normal text-walnut no-underline leading-[1.2] mb-3 block {slideUpActive ? 'animate-slide-up' : ''}"
            style="animation-delay: 0.1s; font-family: 'Playfair Display', Georgia, serif;"
            style:view-transition-name={hasTransitionNames ? 'name-text' : undefined}
          >
            Ethan<br>Hathaway
          </span>
        </button>
        <p
          class="namecard-vt text-[11px] tracking-[0.32em] uppercase text-ash/80 px-8 pt-4 pb-11 relative border-b border-black/5 {slideUpActive ? 'animate-slide-up' : ''} cursor-pointer"
          style="animation-delay: 0.2s;"
          style:view-transition-name={hasTransitionNames ? 'subtitle-text' : undefined}
          onclick={() => isProjectPage ? goto('/') : onNameClick?.()}
          role="button"
          tabindex="0"
        >
          Things I Make
        </p>
      </div>
    {/if}
  {/if}

  <!-- Main Content Area - glass white background fills from namecard to bottom -->
  <div class="flex-1 flex flex-col relative z-0 min-h-0 {isProjectPage ? '' : 'border-l border-black/10'}" style="background: {isMobile ? '#fcfbfa' : 'rgba(245, 241, 235, 0.28)'}; {isMobile ? '' : '-webkit-backdrop-filter: saturate(180%) blur(100px); backdrop-filter: saturate(180%) blur(100px);'}">

    <!-- Scrollable Navigation Area -->
    <nav
      class="flex-1 overflow-y-auto {slideUpActive ? 'animate-slide-up' : ''} min-h-0 max-h-full scrollbar-hide {bottomAlignNav ? 'flex flex-col justify-end pb-10 pt-0 mt-0' : showNameCard ? 'pt-12 mt-16 pb-[50%]' : 'pt-8 mt-8 pb-[50%]'}"
      style="animation-delay: 0.4s"
      onanimationend={handleSlideUpDone}
      onanimationcancel={handleSlideUpDone}
      {@attach storeNav}
    >
      <ItemList scrollContainer={navEl} onItemClick={onItemClick} hoverInfoInWall={hoverInfoInWall} />
    </nav>

    {#if isProjectPage && currentIndex >= 0}
      <div class="hidden lg:flex items-center justify-center gap-3 px-8 pb-8 pt-3 shrink-0 -ml-8">
        <button
          type="button"
          class="p-1.5 rounded-lg transition-colors duration-150 {hasPrev ? 'text-ash hover:text-copper cursor-pointer' : 'text-ash/20 cursor-default'}"
          disabled={!hasPrev}
          onclick={() => hasPrev && goto(`/${portfolio.filteredItems[currentIndex - 1].slug}`)}
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
          onclick={() => hasNext && goto(`/${portfolio.filteredItems[currentIndex + 1].slug}`)}
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
