<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import GalleryItem from './GalleryItem.svelte';

  function handleGalleryLeave() {
    portfolio.setHoveredItem(null);
  }

  const hiddenCount = $derived.by(() => {
    return portfolio.allItems.length - portfolio.filteredItems.length;
  });
</script>

<main class="right-panel flex-1 h-screen overflow-y-auto bg-charcoal scrollbar-thin" onmouseleave={handleGalleryLeave}>
  <div class="grid grid-cols-3 gap-0.5 p-0.5 min-h-full" style="view-transition-name: gallery-grid">
    {#each portfolio.filteredItems as item, index (item.id)}
      <GalleryItem {item} {index} />
    {/each}
  </div>
  <div class="h-[50vh] flex items-start justify-center px-8">
    {#if portfolio.selectedCategory !== 'all' && hiddenCount > 0}
      <p class="text-sm text-cream/70 tracking-wide">
        {hiddenCount} more items to see. remove {portfolio.selectedCategory} filter
      </p>
    {/if}
  </div>
</main>
