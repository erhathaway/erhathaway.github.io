<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import GalleryItem from './GalleryItem.svelte';
  import { env } from '$env/dynamic/public';

  function handleGalleryLeave() {
    portfolio.setHoveredItem(null);
  }

  const homeNamecardInGallery = (() => {
    const raw = env.PUBLIC_HOME_NAMECARD_IN_GALLERY;
    const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    return value === '1' || value === 'true' || value === 'yes' || value === 'on';
  })();

  function openNamecardModal() {
    try {
      window.dispatchEvent(new Event('namecard:open'));
    } catch {
      // ignore
    }
  }

  function handleNamecardTileEnter() {
    portfolio.setHoveredItem(null);
  }

  const hiddenCount = $derived.by(() => {
    return portfolio.allItems.length - portfolio.filteredItems.length;
  });
</script>

<main class="right-panel flex-1 h-screen overflow-y-auto bg-charcoal scrollbar-thin" onmouseleave={handleGalleryLeave}>
  <div class="grid grid-cols-3 gap-0.5 p-0.5 min-h-full vt-exclude-namecard" style="view-transition-name: gallery-grid">
    {#if homeNamecardInGallery}
      <button
        type="button"
        class="gallery-item group relative aspect-square overflow-hidden cursor-pointer block focus:outline-none focus-visible:ring-2 focus-visible:ring-copper"
        onclick={openNamecardModal}
        onmouseenter={handleNamecardTileEnter}
        aria-label="About Ethan Hathaway"
      >
        <div
          class="namecard-vt absolute inset-0 border backdrop-blur-md transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          style="view-transition-name: name-card-bg; border-color: rgba(138,128,120,0.15); background: radial-gradient(circle at bottom right, rgba(253,218,130,0.3), rgba(255,255,255,0.1) 60%, rgba(255,255,255,0.1));"
        ></div>
        <div class="relative z-10 h-full p-7 flex flex-col justify-center gap-6 text-walnut">
          <span
            class="namecard-vt text-[44px] font-normal leading-[1.05] block"
            style="font-family: 'Playfair Display', Georgia, serif; view-transition-name: name-text"
          >
            Ethan<br />Hathaway
          </span>
          <p
            class="namecard-vt text-[12px] tracking-[0.32em] uppercase text-ash/80"
            style="view-transition-name: subtitle-text"
          >
            Things I Make
          </p>
        </div>
      </button>
    {/if}
    {#each portfolio.filteredItems as item, index (item.id)}
      <GalleryItem {item} index={homeNamecardInGallery ? index + 1 : index} />
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
