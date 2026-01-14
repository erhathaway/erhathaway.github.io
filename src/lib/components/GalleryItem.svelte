<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import type { PortfolioItem } from '$lib/data/items';

  let { item, index = 0 }: { item: PortfolioItem; index?: number } = $props();

  const gridSpan = $derived(() => {
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

  function handleMouseLeave() {
    portfolio.setHoveredItem(null);
  }
</script>

<a
  href="/project/{item.id}"
  class="gallery-item relative aspect-square overflow-hidden cursor-pointer {gridSpan()} block animate-fade-in"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  aria-label="{item.name} - {item.subcategory}"
  style="view-transition-name: project-image-{item.id}; animation-delay: {index * 0.05}s"
>
  <div class="placeholder-bg w-full h-full relative bg-gradient-to-br {item.gradientColors}"></div>
  <span class="item-number absolute bottom-4 left-4 font-display text-sm text-white/60 z-10">
    {item.id.toString().padStart(2, '0')}
  </span>
</a>