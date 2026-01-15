<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { page } from '$app/stores';
  import HoverInfo from './HoverInfo.svelte';

  let { scrollContainer, onItemClick }: { scrollContainer: HTMLElement | null, onItemClick?: () => void } = $props();

  const hoveredItem = $derived(portfolio.hoveredItem);
  let itemEls = $state<Record<number, HTMLElement | null>>({});
  let itemScales = $state<Record<number, number>>({});
  let hasOverflowTop = $state(false);
  let hasOverflowBottom = $state(false);
  let isInitialized = $state(false);
  let isMouseNear = $state(false);
  let backgroundRecalcInterval: number | null = null;

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
    hasOverflowTop = scrollContainer.scrollTop > 0;
    hasOverflowBottom = scrollContainer.scrollHeight > scrollContainer.clientHeight + scrollContainer.scrollTop;

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

  // Setup scroll and event listeners
  $effect(() => {
    if (!scrollContainer) return;

    const handleScroll = () => {
      requestAnimationFrame(() => {
        updateItemScales();
      });
    };

    scrollContainer.addEventListener('scroll', handleScroll);

    // Also update on window resize
    const handleResize = () => requestAnimationFrame(updateItemScales);
    window.addEventListener('resize', handleResize);

    // Update scales when mouse enters the container
    const handleMouseEnter = () => {
      isMouseNear = true;
      requestAnimationFrame(updateItemScales);
    };
    scrollContainer.addEventListener('mouseenter', handleMouseEnter);

    // Track when mouse leaves the container
    const handleMouseLeave = () => {
      isMouseNear = false;
    };
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);

    // Track mouse proximity to the container (within 100px)
    const handleMouseMove = (e: MouseEvent) => {
      const rect = scrollContainer.getBoundingClientRect();
      const buffer = 100; // pixels

      const nearContainer =
        e.clientX >= rect.left - buffer &&
        e.clientX <= rect.right + buffer &&
        e.clientY >= rect.top - buffer &&
        e.clientY <= rect.bottom + buffer;

      isMouseNear = nearContainer;
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  });

  // Initial calculation - run once when container is ready
  $effect(() => {
    if (!scrollContainer || isInitialized) return;

    // Mark as initialized to prevent re-runs
    isInitialized = true;

    // Initial calculations with delays to ensure DOM is ready
    updateItemScales();
    setTimeout(updateItemScales, 10);
    setTimeout(updateItemScales, 50);
    setTimeout(updateItemScales, 150);
    setTimeout(updateItemScales, 300);
    setTimeout(updateItemScales, 600);
    setTimeout(updateItemScales, 1000);
  });

  // Background recalculation when mouse is not near
  $effect(() => {
    if (!scrollContainer) return;

    // Start or stop background recalculation based on mouse proximity
    if (!isMouseNear && !backgroundRecalcInterval) {
      // Immediate recalculation when starting background mode
      requestAnimationFrame(updateItemScales);

      // Start periodic recalculation every 500ms when mouse is away
      backgroundRecalcInterval = window.setInterval(() => {
        // Only recalculate if mouse is still away
        if (!isMouseNear) {
          requestAnimationFrame(updateItemScales);
        }
      }, 500);
    } else if (isMouseNear && backgroundRecalcInterval) {
      // Stop background recalculation when mouse is near
      window.clearInterval(backgroundRecalcInterval);
      backgroundRecalcInterval = null;
    }

    return () => {
      if (backgroundRecalcInterval) {
        window.clearInterval(backgroundRecalcInterval);
        backgroundRecalcInterval = null;
      }
    };
  });

  // Recalculate when filtered items change
  $effect(() => {
    // Trigger on filteredItems change
    const itemCount = portfolio.filteredItems.length;
    if (scrollContainer && itemCount > 0) {
      // Delay to allow DOM updates
      setTimeout(() => {
        requestAnimationFrame(updateItemScales);
      }, 100);
    }
  });

  // Scroll to center the hovered item in the visible portion
  $effect(() => {
    const id = hoveredItem?.id;
    if (!id || !scrollContainer) return;
    const node = itemEls[id];
    if (!node) return;

    // Calculate the center position
    const containerHeight = scrollContainer.clientHeight;
    const itemTop = node.offsetTop;
    const itemHeight = node.offsetHeight;
    const scrollTarget = itemTop - (containerHeight / 2) + (itemHeight / 2);

    // Smooth scroll to center
    scrollContainer.scrollTo({
      top: Math.max(0, scrollTarget),
      behavior: 'smooth'
    });
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
          {#if isHovered}
            <HoverInfo item={item} />
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
