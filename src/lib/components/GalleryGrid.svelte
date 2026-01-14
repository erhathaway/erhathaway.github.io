<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import GalleryItem from './GalleryItem.svelte';
</script>

<main class="right-panel flex-1 h-screen overflow-y-auto bg-charcoal scrollbar-thin">
  <div class="grid grid-cols-3 gap-0.5 p-0.5 min-h-full" style="view-transition-name: gallery-grid">
    {#each portfolio.filteredItems as item, index}
      <GalleryItem {item} {index} />
    {/each}
  </div>
</main>