<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import GalleryItem from './GalleryItem.svelte';
  import { env } from '$env/dynamic/public';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import HoverInfo from './HoverInfo.svelte';

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

  type DockTarget =
    | { target: 'item'; id: number; dockSide: 'left' | 'right' }
    | { target: 'namecard'; dockSide: 'left' | 'right' }
    | null;

  const hoveredItem = $derived(portfolio.hoveredItem);

  const hoveredFilteredIndex = $derived.by(() => {
    if (!hoveredItem) return -1;
    return portfolio.filteredItems.findIndex((it) => it.id === hoveredItem.id);
  });

  const hoveredDisplayIndex = $derived.by(() => {
    if (hoveredFilteredIndex < 0) return -1;
    return hoveredFilteredIndex + (homeNamecardInGallery ? 1 : 0);
  });

  const itemTilesCount = $derived.by(() => {
    return portfolio.filteredItems.length + (homeNamecardInGallery ? 1 : 0);
  });

  const dockTarget = $derived.by((): DockTarget => {
    if (!hoveredItem) return null;
    if (hoveredDisplayIndex < 0) return null;

    const col = hoveredDisplayIndex % 3;
    const candidates: Array<{ displayIndex: number; dockSide: 'left' | 'right' }> = [];

    // Candidate on the right: dock trapezoid on the left edge (toward hovered tile)
    if (col < 2) {
      candidates.push({ displayIndex: hoveredDisplayIndex + 1, dockSide: 'left' });
    }
    // Candidate on the left: dock trapezoid on the right edge (toward hovered tile)
    if (col > 0) {
      candidates.push({ displayIndex: hoveredDisplayIndex - 1, dockSide: 'right' });
    }

    const pick = (allowNamecard: boolean): DockTarget => {
      for (const candidate of candidates) {
        if (candidate.displayIndex < 0) continue;
        if (candidate.displayIndex >= itemTilesCount) continue;

        if (homeNamecardInGallery && candidate.displayIndex === 0) {
          if (allowNamecard) return { target: 'namecard', dockSide: candidate.dockSide };
          continue;
        }

        const itemIndex = candidate.displayIndex - (homeNamecardInGallery ? 1 : 0);
        if (itemIndex < 0 || itemIndex >= portfolio.filteredItems.length) continue;
        return { target: 'item', id: portfolio.filteredItems[itemIndex].id, dockSide: candidate.dockSide };
      }
      return null;
    };

    // Prefer docking onto a real image tile (skip the title card).
    const withoutNamecard = pick(false);
    if (withoutNamecard) return withoutNamecard;

    // If there are no other images, allow docking onto the title card.
    if (homeNamecardInGallery && portfolio.filteredItems.length <= 1) {
      return pick(true);
    }

    return null;
  });

  const dockTargetItemId = $derived.by(() => (dockTarget?.target === 'item' ? dockTarget.id : null));
  const dockSide = $derived.by(() => dockTarget?.dockSide ?? 'left');
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
        {#if portfolio.namecardImage}
          <img
            src={portfolio.namecardImage.imageUrl}
            alt="Ethan Hathaway"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            style:object-position="{portfolio.namecardImage.positionX}% {portfolio.namecardImage.positionY}%"
            style:transform="scale({portfolio.namecardImage.zoom})"
            style:transform-origin="{portfolio.namecardImage.positionX}% {portfolio.namecardImage.positionY}%"
            style="view-transition-name: name-card-bg"
            draggable="false"
          />
        {:else}
          <div
            class="namecard-vt absolute inset-0 border backdrop-blur-md transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            style="view-transition-name: name-card-bg; border-color: rgba(138,128,120,0.15); background: radial-gradient(circle at bottom right, rgba(253,218,130,0.3), rgba(255,255,255,0.1) 60%, rgba(255,255,255,0.1)); background-color: #f3e9e1;"
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
        {/if}

        {#if hoveredItem && dockTarget?.target === 'namecard'}
          <div class="absolute inset-0 z-20 pointer-events-none">
            <HoverInfo item={hoveredItem} variant="tile" dockSide={dockSide} />
          </div>
        {/if}
      </button>
    {/if}
    {#each portfolio.filteredItems as item, index (item.id)}
      <GalleryItem
        {item}
        index={homeNamecardInGallery ? index + 1 : index}
        hoverInfoInWall={homeNamecardInGallery}
        dockHoverItem={hoveredItem}
        dockHoverTargetId={dockTargetItemId}
        dockHoverSourceId={hoveredItem?.id ?? null}
        dockSide={dockSide}
      />
    {/each}
    {#if browser && $page.url.pathname === '/'}
      <div class="col-span-3">
        <div
          class="relative overflow-hidden border backdrop-blur-md"
          style="border-color: rgba(138,128,120,0.15); background: radial-gradient(circle at bottom right, rgba(253,218,130,0.22), rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.08)); background-color: #f3e9e1;"
        >
          <div class="px-8 py-6 flex items-center justify-center">
            <div class="flex gap-10 text-sm tracking-[0.18em] uppercase text-walnut/70">
              <a href="https://github.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors">GitHub</a>
              <a href="https://instagram.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors">Instagram</a>
              <a href="mailto:erhathaway@gmail.com" class="hover:text-copper transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
  {#if portfolio.selectedCategory !== 'all' && hiddenCount > 0}
    <div class="py-10 flex items-start justify-center px-8">
      <p class="text-sm text-cream/70 tracking-wide">
        {hiddenCount} more items to see. remove {portfolio.selectedCategory} filter
      </p>
    </div>
  {/if}
</main>
