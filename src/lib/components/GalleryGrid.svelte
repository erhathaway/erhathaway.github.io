<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import GalleryItem from './GalleryItem.svelte';

  // Debug log
  $effect(() => {
    console.log('Gallery filtered items:', portfolio.filteredItems);
  });
</script>

<main class="right-panel flex-1 h-screen overflow-y-auto bg-charcoal scrollbar-thin">
  <div class="grid grid-cols-3 gap-0.5 p-0.5 min-h-full">
    {#each portfolio.filteredItems as item}
      <GalleryItem {item} />
    {/each}
  </div>
</main>