<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import type { PortfolioItem } from '$lib/data/items';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import HoverInfo from './HoverInfo.svelte';

  let {
    item,
    index = 0,
    hoverInfoInWall = false,
    dockHoverItem = null,
    dockHoverTargetId = null,
    dockHoverSourceId = null,
    dockHasTarget = false,
    dockSide = 'left',
    static: isStatic = false,
    href: hrefOverride = undefined
  }: {
    item: PortfolioItem;
    index?: number;
    hoverInfoInWall?: boolean;
    dockHoverItem?: PortfolioItem | null;
    dockHoverTargetId?: number | null;
    dockHoverSourceId?: number | null;
    dockHasTarget?: boolean;
    dockSide?: 'left' | 'right';
    static?: boolean;
    href?: string;
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
    if (isStatic) {
      fadeInActive = false;
      return;
    }
    const timer = window.setTimeout(() => {
      fadeInActive = false;
    }, 1200 + index * 50);
    return () => window.clearTimeout(timer);
  });

  // Check if this item is the active project
  const isActive = $derived.by(() => {
    if (isStatic) return false;
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
    if (isStatic) return;
    portfolio.setHoveredItem(item.id);
    try {
      window.dispatchEvent(new CustomEvent('portfolio:hover', { detail: { id: item.id } }));
    } catch {
      // ignore
    }
  }

  const isHovered = $derived.by(() => isStatic ? false : portfolio.hoveredItemId === item.id);
  const showDockedHover = $derived.by(() => isStatic ? false : hoverInfoInWall && dockHoverItem && dockHoverTargetId === item.id);
  const isDockSource = $derived.by(() => isStatic ? false : dockHoverSourceId !== null && dockHoverSourceId === item.id);
  const shouldShowFallbackHover = $derived.by(() => {
    if (isStatic) return false;
    if (!hoverInfoInWall) return false;
    if (!isHovered) return false;
    if (dockHasTarget) return false;
    if (isDockSource && dockHoverTargetId !== null) return false;
    return true;
  });

</script>

<a
  href={hrefOverride ?? `/project/${item.id}`}
  class="gallery-item group relative aspect-square overflow-hidden cursor-pointer {isStatic ? '' : gridSpan} block {fadeInActive ? 'animate-fade-in' : ''} {isActive ? 'ring-2 ring-copper' : ''}"
  onmouseenter={handleMouseEnter}
  onanimationend={isStatic ? undefined : handleFadeInDone}
  onanimationcancel={isStatic ? undefined : handleFadeInDone}
  aria-label="{item.name} - {item.categories.join(', ')}"
  aria-current={isActive ? 'page' : undefined}
  style:view-transition-name={isStatic ? undefined : `project-image-${item.id}`}
  style:animation-delay={fadeInActive ? `${index * 0.05}s` : undefined}
>
  {#if item.image}
    <img
      src={item.image}
      alt={item.name}
      class="w-full h-full object-cover {item.hoverImage ? 'transition-opacity duration-300 group-hover:opacity-0' : ''}"
      style:object-position="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
      style:transform="scale({item.coverPosition?.zoom ?? 1})"
      style:transform-origin="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
      loading={index < 6 ? 'eager' : 'lazy'}
      fetchpriority={index < 6 ? 'high' : undefined}
    />
    {#if item.hoverImage}
      <img
        src={item.hoverImage}
        alt={item.name}
        class="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style:object-position="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
        style:transform="scale({item.coverPosition?.zoom ?? 1})"
        style:transform-origin="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
        loading={index < 6 ? 'eager' : 'lazy'}
      />
    {/if}
  {:else}
    <div class="placeholder-bg w-full h-full relative bg-gradient-to-br {item.gradientColors}"></div>
  {/if}
  <span class="item-number absolute bottom-4 left-4 font-display text-sm {isActive ? 'text-copper' : 'text-white/60'} z-10">
    {item.id.toString().padStart(2, '0')}
  </span>

  {#if showDockedHover}
    <div class="absolute inset-0 z-10 bg-black/25 pointer-events-none"></div>
    <div class="absolute inset-0 z-20 pointer-events-none">
      <HoverInfo item={dockHoverItem} variant="tile" dockSide={dockSide} />
    </div>
  {:else if shouldShowFallbackHover}
    <!-- Fallback: if no dock target was found, show hover info on the hovered tile -->
    <div class="absolute inset-0 z-10 bg-black/25 pointer-events-none"></div>
    <div class="absolute inset-0 z-20 pointer-events-none">
      <HoverInfo item={item} variant="tile" dockSide="left" />
    </div>
  {/if}

</a>
