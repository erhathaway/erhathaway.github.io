<script lang="ts">
  import CategoryPills from './CategoryPills.svelte';
  import ItemList from './ItemList.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let { isMobile = false, onItemClick, onNameClick, hasTransitionNames = true }: { isMobile?: boolean, onItemClick?: () => void, onNameClick?: () => void, hasTransitionNames?: boolean } = $props();

  const isProjectPage = $derived($page.route.id?.includes('/project/'));
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
  <!-- Background rectangle behind name and tagline -->
  <div
    class="absolute top-0 left-0 w-[280px] h-[220px] border backdrop-blur-md z-0 {onNameClick ? 'cursor-pointer' : ''}"
    style="border-color: rgba(138,128,120,0.15); background: radial-gradient(circle at bottom right, rgba(253,218,130,0.3), rgba(255,255,255,0.1) 60%, rgba(255,255,255,0.1));"
    style:view-transition-name={hasTransitionNames ? 'name-card-bg' : undefined}
    onclick={() => onNameClick?.()}
    onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onNameClick?.(); }}
    role="button"
    tabindex={onNameClick ? 0 : -1}
  ></div>


  <!-- Fixed Header - Always on top -->
  <div class="p-8 pt-10 pb-0 z-30 relative bg-transparent {onNameClick ? 'cursor-pointer' : ''}" onclick={() => onNameClick?.()} onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onNameClick?.(); }} role="button" tabindex={onNameClick ? 0 : -1}>
    <span
      class="text-[38px] font-normal text-walnut no-underline leading-[1.2] mb-3 block {slideUpActive ? 'animate-slide-up' : ''}"
      style="animation-delay: 0.1s; font-family: 'Playfair Display', Georgia, serif;"
      style:view-transition-name={hasTransitionNames ? 'name-text' : undefined}
    >
      Ethan<br>Hathaway
    </span>
  </div>

  <!-- Main Content Area -->
  <div class="flex-1 flex flex-col p-8 pt-4 relative z-0 min-h-0">
    <p
      class="text-[11px] tracking-[0.32em] uppercase text-ash/80 {slideUpActive ? 'animate-slide-up' : ''}"
      style="animation-delay: 0.2s;"
      style:view-transition-name={hasTransitionNames ? 'subtitle-text' : undefined}
    >
      Things I Make
    </p>

    <!-- Scrollable Navigation Area -->
    <nav
      class="flex-1 overflow-y-auto {slideUpActive ? 'animate-slide-up' : ''} min-h-0 max-h-full scrollbar-hide pt-12 pb-[50%] -mx-8 mt-16"
      style="animation-delay: 0.4s"
      onanimationend={handleSlideUpDone}
      onanimationcancel={handleSlideUpDone}
      {@attach storeNav}
    >
      <ItemList scrollContainer={navEl} onItemClick={onItemClick} />

      <!-- Admin Link (scrolls with content) -->
    </nav>
  </div>
</aside>
