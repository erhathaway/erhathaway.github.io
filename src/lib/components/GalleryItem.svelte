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

  function handleMouseLeave() {
    portfolio.setHoveredItem(null);
  }

  function handleClick() {
    portfolio.setTransitionItem(item.id);
  }

  async function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      await portfolio.uploadImage(item.id, file);
    }
  }
</script>

<a
  href="/project/{item.id}"
  class="gallery-item group relative aspect-square overflow-hidden cursor-pointer {gridSpan()} block animate-fade-in {isActive() ? 'ring-2 ring-copper' : ''}"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onclick={handleClick}
  aria-label="{item.name} - {item.subcategory}"
  aria-current={isActive() ? 'page' : undefined}
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
  <span class="item-number absolute bottom-4 left-4 font-display text-sm {isActive() ? 'text-copper' : 'text-white/60'} z-10">
    {item.id.toString().padStart(2, '0')}
  </span>

  <!-- Upload button - only show if no image -->
  {#if !item.image}
    <div class="absolute top-3 right-3 opacity-0 hover:opacity-100 transition-opacity z-20 group-hover:opacity-100">
      <label class="cursor-pointer bg-walnut/80 backdrop-blur-sm text-white p-2 rounded-full hover:bg-walnut/90 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <input
          type="file"
          accept="image/*"
          class="hidden"
          onchange={handleImageUpload}
          onclick={(e) => e.stopPropagation()}
        />
      </label>
    </div>
  {/if}
</a>
