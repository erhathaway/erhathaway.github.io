<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import type { PortfolioItem } from '$lib/data/items';
  import { page } from '$app/stores';

  let { item, index = 0 }: { item: PortfolioItem; index?: number } = $props();

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
  }

</script>

<a
  href="/project/{item.id}"
  class="gallery-item group relative aspect-square overflow-hidden cursor-pointer {gridSpan} block animate-fade-in {isActive ? 'ring-2 ring-copper' : ''}"
  onmouseenter={handleMouseEnter}
  aria-label="{item.name} - {item.categories.join(', ')}"
  aria-current={isActive ? 'page' : undefined}
  style="view-transition-name: project-image-{item.id}; animation-delay: {index * 0.05}s"
>
  {#if item.image}
    <img
      src={item.image}
      alt={item.name}
      class="w-full h-full object-cover"
      loading="lazy"
    />
  {:else}
    <div class="placeholder-bg w-full h-full relative bg-gradient-to-br {item.gradientColors}"></div>
  {/if}
  <span class="item-number absolute bottom-4 left-4 font-display text-sm {isActive ? 'text-copper' : 'text-white/60'} z-10">
    {item.id.toString().padStart(2, '0')}
  </span>

</a>
