<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { page } from '$app/stores';
  import HoverInfo from './HoverInfo.svelte';
  import { onMount } from 'svelte';

  let { scrollContainer, onItemClick, hoverInfoInWall = false }: { scrollContainer: HTMLElement | null, onItemClick?: () => void, hoverInfoInWall?: boolean } = $props();

  const hoveredItem = $derived(portfolio.hoveredItem);
  let itemEls = $state<Record<number, HTMLElement | null>>({});
  let itemScales = $state<Record<number, number>>({});

  // Get the active project ID from the URL
  const activeProjectId = $derived.by(() => {
    const match = $page.url.pathname.match(/^\/project\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  });

  function storeEl(id: number) {
    return (node: HTMLElement) => {
      itemEls[id] = node;
      // Initialize scale to 1 if not set
      if (itemScales[id] === undefined) {
        itemScales[id] = 1;
      }
      return () => {
        itemEls[id] = null;
      };
    };
  }

  function updateItemScales() {
    if (!scrollContainer) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const containerTop = containerRect.top;
    const containerBottom = containerRect.bottom;
    const containerHeight = containerRect.height;

    // Check for overflow
    const hasOverflowTop = scrollContainer.scrollTop > 0;
    const hasOverflowBottom = scrollContainer.scrollHeight > scrollContainer.clientHeight + scrollContainer.scrollTop;

    // Only apply scaling if there's overflow
    if (!hasOverflowTop && !hasOverflowBottom) {
      // Reset all scales to 1
      Object.keys(itemEls).forEach(id => {
        itemScales[parseInt(id)] = 1;
      });
      return;
    }

    // Calculate scale for each item based on position
    Object.entries(itemEls).forEach(([id, el]) => {
      if (!el) return;

      const itemRect = el.getBoundingClientRect();
      const itemCenter = itemRect.top + itemRect.height / 2;

      // Calculate distance from visible edges
      const distanceFromTop = itemCenter - containerTop;
      const distanceFromBottom = containerBottom - itemCenter;

      // Define fade zones (10% of container height from edges)
      const fadeZone = containerHeight * 0.1;
      const minScale = 0.4;

      let scale = 1;

      // Check if item is near top edge and there's overflow above
      if (hasOverflowTop && distanceFromTop < fadeZone && distanceFromTop > 0) {
        // Linear scaling: closer to edge = smaller
        scale = minScale + (1 - minScale) * (distanceFromTop / fadeZone);
      }
      // Check if item is near bottom edge and there's overflow below
      else if (hasOverflowBottom && distanceFromBottom < fadeZone && distanceFromBottom > 0) {
        // Linear scaling: closer to edge = smaller
        scale = minScale + (1 - minScale) * (distanceFromBottom / fadeZone);
      }
      // Items outside the visible area get minimum scale
      else if (distanceFromTop < 0 || distanceFromBottom < 0) {
        scale = minScale;
      }

      itemScales[parseInt(id)] = scale;
    });
  }

  function scrollToItem(id: number) {
    if (!scrollContainer) return;
    const node = itemEls[id];
    if (!node) return;

    const containerHeight = scrollContainer.clientHeight;
    const itemTop = node.offsetTop;
    const itemHeight = node.offsetHeight;
    const scrollTarget = itemTop - containerHeight / 2 + itemHeight / 2;

    scrollContainer.scrollTo({
      top: Math.max(0, scrollTarget),
      behavior: 'smooth'
    });
  }

  onMount(() => {
    let attachedTo: HTMLElement | null = null;
    let rafId: number | null = null;

    const handleScroll = () => requestAnimationFrame(updateItemScales);
    const handleResize = () => requestAnimationFrame(updateItemScales);

    const handlePortfolioHover = (event: Event) => {
      const id = (event as CustomEvent<{ id?: number }>).detail?.id;
      if (!id) return;
      scrollToItem(id);
    };

    window.addEventListener('portfolio:hover', handlePortfolioHover as EventListener);

    const attach = (el: HTMLElement) => {
      attachedTo = el;
      el.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);

      updateItemScales();
      setTimeout(updateItemScales, 50);
      setTimeout(updateItemScales, 250);
    };

    const detach = (el: HTMLElement) => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };

    const tickAttach = () => {
      if (scrollContainer && scrollContainer !== attachedTo) {
        if (attachedTo) detach(attachedTo);
        attach(scrollContainer);
      }
      rafId = requestAnimationFrame(tickAttach);
    };

    tickAttach();

    return () => {
      window.removeEventListener('portfolio:hover', handlePortfolioHover as EventListener);
      if (rafId) cancelAnimationFrame(rafId);
      if (attachedTo) detach(attachedTo);
    };
  });
</script>

<ul class="space-y-2.5 w-full">
  {#each portfolio.filteredItems as item (item.id)}
    {@const isActive = activeProjectId === item.id}
    {@const isHovered = hoveredItem?.id === item.id}
    {@const scale = itemScales[item.id] || 1}
    <li class="w-full" {@attach storeEl(item.id)}>
      <a
        href="/project/{item.id}"
        class="item-link hover:text-copper transition-colors duration-200 view-transition-item w-full block {isActive ? 'text-copper font-medium' : 'text-walnut'} {isHovered ? '' : 'pb-0.5'}"
        class:active={isActive || isHovered}
        class:active-project={isActive}
        aria-current={isActive ? 'page' : undefined}
        onclick={() => onItemClick?.()}
      >
        <div class="item-content-wrapper">
          {#if isHovered && !hoverInfoInWall}
            <HoverInfo item={item} variant="inline" />
          {:else}
            <span
              class="item-label block px-8"
              class:active-project={isActive}
              style="font-size: {isActive ? 1.125 * scale : 0.875 * scale}rem; opacity: {Math.pow(scale, 3)};"
            >
              {item.name}
            </span>
          {/if}
        </div>
      </a>
    </li>
  {/each}
</ul>
