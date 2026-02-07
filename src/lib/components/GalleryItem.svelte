<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import type { PortfolioItem } from '$lib/data/items';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import HoverInfo from './HoverInfo.svelte';

  let {
    item,
    index = 0,
    hoverInfoInWall = false
  }: {
    item: PortfolioItem;
    index?: number;
    hoverInfoInWall?: boolean;
  } = $props();
  // View transitions temporarily hide the live DOM, which can cause CSS animations to restart
  // when it is revealed again. Disable the "entrance" animation after its first run.
  let fadeInActive = $state(true);

  function handleFadeInDone(e: AnimationEvent) {
    if (e.target !== e.currentTarget) return;
    if (e.animationName !== 'fadeIn') return;
    fadeInActive = false;
  }

  onMount(() => {
    const timer = window.setTimeout(() => {
      fadeInActive = false;
    }, 1200 + index * 50);
    return () => window.clearTimeout(timer);
  });

  // Check if this item is the active project
  const isActive = $derived.by(() => {
    const match = $page.url.pathname.match(/^\/project\/(\d+)/);
    return match && parseInt(match[1]) === item.id;
  });

  const gridSpan = $derived.by(() => {
    switch (item.gridSize) {
      case 'wide':
        return 'col-span-2';
      case 'tall':
        return 'row-span-2';
      case 'featured':
        return 'col-span-2 row-span-2';
      default:
        return '';
    }
  });

  function handleMouseEnter() {
    portfolio.setHoveredItem(item.id);
    try {
      window.dispatchEvent(new CustomEvent('portfolio:hover', { detail: { id: item.id } }));
    } catch {
      // ignore
    }
  }

  const isHovered = $derived.by(() => portfolio.hoveredItemId === item.id);

</script>

<a
  href="/project/{item.id}"
  class="gallery-item group relative aspect-square overflow-hidden cursor-pointer {gridSpan} block {fadeInActive ? 'animate-fade-in' : ''} {isActive ? 'ring-2 ring-copper' : ''}"
  onmouseenter={handleMouseEnter}
  onanimationend={handleFadeInDone}
  onanimationcancel={handleFadeInDone}
  aria-label="{item.name} - {item.categories.join(', ')}"
  aria-current={isActive ? 'page' : undefined}
  style="view-transition-name: project-image-{item.id};"
  style:animation-delay={fadeInActive ? `${index * 0.05}s` : undefined}
>
  {#if item.image}
    <img
      src={item.image}
      alt={item.name}
      class="w-full h-full object-cover"
      style:object-position="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
      style:transform="scale({item.coverPosition?.zoom ?? 1})"
      style:transform-origin="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
      loading="lazy"
    />
  {:else}
    <div class="placeholder-bg w-full h-full relative bg-gradient-to-br {item.gradientColors}"></div>
  {/if}
  <span class="item-number absolute bottom-4 left-4 font-display text-sm {isActive ? 'text-copper' : 'text-white/60'} z-10">
    {item.id.toString().padStart(2, '0')}
  </span>

  {#if hoverInfoInWall && isHovered}
    <div class="absolute inset-0 z-20 pointer-events-none">
      <HoverInfo item={item} variant="tile" />
    </div>
  {/if}

</a>
