<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import GalleryItem from './GalleryItem.svelte';
  import { env } from '$env/dynamic/public';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import HoverInfo from './HoverInfo.svelte';
  import AuthButton from './AuthButton.svelte';
  import { getImageSources } from '$lib/utils/image-formats';

  let innerWidth = $state(browser ? window.innerWidth : 1200);
  const colCount = $derived(innerWidth < 900 ? 2 : 3);

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
    | { target: 'filler'; dockSide: 'left' | 'right' }
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

  const displayTileCount = $derived.by(() => itemTilesCount);
  const fillerSpan = $derived.by(() => {
    const remainder = displayTileCount % colCount;
    if (remainder === 0) return 0;
    return colCount - remainder;
  });
  const fillerStartDisplayIndex = $derived.by(() => displayTileCount);
  const fillerClass = $derived.by(() => {
    if (fillerSpan === 0) return '';
    if (fillerSpan === 1) return 'col-span-1 aspect-square';
    return `aspect-[${fillerSpan}/1]`;
  });
  const fillerGridColumn = $derived.by(() => {
    if (fillerSpan <= 1) return undefined;
    return `span ${fillerSpan}`;
  });

  const dockTarget = $derived.by((): DockTarget => {
    if (!hoveredItem) return null;
    if (hoveredDisplayIndex < 0) return null;

    const col = hoveredDisplayIndex % colCount;
    const candidates: Array<{ displayIndex: number; dockSide: 'left' | 'right' }> = [];

    // Candidate on the right: dock trapezoid on the left edge (toward hovered tile)
    if (col < colCount - 1) {
      candidates.push({ displayIndex: hoveredDisplayIndex + 1, dockSide: 'left' });
    }
    // Candidate on the left: dock trapezoid on the right edge (toward hovered tile)
    if (col > 0) {
      candidates.push({ displayIndex: hoveredDisplayIndex - 1, dockSide: 'right' });
    }

    const pick = (allowNamecard: boolean): DockTarget => {
      for (const candidate of candidates) {
        if (candidate.displayIndex < 0) continue;
        if (candidate.displayIndex >= itemTilesCount) {
          if (
            fillerSpan > 0 &&
            candidate.displayIndex >= fillerStartDisplayIndex &&
            candidate.displayIndex < fillerStartDisplayIndex + fillerSpan
          ) {
            return { target: 'filler', dockSide: candidate.dockSide };
          }
          continue;
        }

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
  const hasDockTarget = $derived.by(() => dockTarget !== null);
</script>

<svelte:window bind:innerWidth />

<main class="right-panel flex-1 h-screen overflow-y-auto bg-charcoal scrollbar-hide" onmouseleave={handleGalleryLeave}>
  <div class="grid gap-0.5 p-0.5 min-h-full vt-exclude-namecard" style="view-transition-name: gallery-grid; grid-template-columns: repeat({colCount}, 1fr);">
    {#if homeNamecardInGallery}
      <div
        class="gallery-item group relative aspect-square overflow-hidden block"
        onmouseenter={handleNamecardTileEnter}
        role="img"
        aria-label="About Ethan Hathaway"
      >
        {#if portfolio.namecardImage}
          {#if portfolio.namecardImage.imageFormats?.length}
            <picture>
              {#each getImageSources(portfolio.namecardImage.imageUrl, portfolio.namecardImage.imageFormats) as source (source.type)}
                <source srcset={source.srcset} type={source.type} />
              {/each}
              <img
                src={portfolio.namecardImage.imageUrl}
                alt="Ethan Hathaway"
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                style:object-position="{portfolio.namecardImage.positionX}% {portfolio.namecardImage.positionY}%"
                style:transform="scale({portfolio.namecardImage.zoom})"
                style:transform-origin="{portfolio.namecardImage.positionX}% {portfolio.namecardImage.positionY}%"
                style="view-transition-name: name-card-bg"
                fetchpriority="high"
                draggable="false"
              />
            </picture>
          {:else}
            <img
              src={portfolio.namecardImage.imageUrl}
              alt="Ethan Hathaway"
              class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              style:object-position="{portfolio.namecardImage.positionX}% {portfolio.namecardImage.positionY}%"
              style:transform="scale({portfolio.namecardImage.zoom})"
              style:transform-origin="{portfolio.namecardImage.positionX}% {portfolio.namecardImage.positionY}%"
              style="view-transition-name: name-card-bg"
              fetchpriority="high"
              draggable="false"
            />
          {/if}
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
          <div class="absolute inset-0 z-10 bg-black/25 pointer-events-none"></div>
          <div class="absolute inset-0 z-20 pointer-events-none">
            <HoverInfo item={hoveredItem} variant="tile" dockSide={dockSide} />
          </div>
        {/if}
      </div>
    {/if}
    {#each portfolio.filteredItems as item, index (item.id)}
      <GalleryItem
        {item}
        index={homeNamecardInGallery ? index + 1 : index}
        hoverInfoInWall={homeNamecardInGallery}
        dockHoverItem={hoveredItem}
        dockHoverTargetId={dockTargetItemId}
        dockHoverSourceId={hoveredItem?.id ?? null}
        dockHasTarget={hasDockTarget}
        dockSide={dockSide}
      />
    {/each}
    {#if fillerSpan > 0}
      <div class="gallery-item relative overflow-hidden border {fillerClass}" aria-hidden="true" style="border-color: rgba(255,255,255,0.08); background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); {fillerGridColumn ? `grid-column: ${fillerGridColumn};` : ''}">
        {#if hoveredItem && dockTarget?.target === 'filler'}
          <div class="absolute inset-0 z-10 bg-black/25 pointer-events-none"></div>
          <div class="absolute inset-0 z-20 pointer-events-none">
            <HoverInfo item={hoveredItem} variant="tile" dockSide={dockSide} />
          </div>
        {/if}
      </div>
    {/if}
    {#if browser && $page.url.pathname === '/'}
      <div style="grid-column: span {colCount};">
        <div
          class="relative overflow-hidden border backdrop-blur-md"
          style="border-color: rgba(138,128,120,0.15); background: radial-gradient(circle at bottom right, rgba(253,218,130,0.22), rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.08)); background-color: #f3e9e1;"
        >
          <div class="relative px-8 py-5 flex items-center justify-center">
            <div class="flex gap-6 text-[11px] tracking-[0.2em] uppercase text-ash/50" style="font-family: 'DM Sans', sans-serif; font-weight: 500;">
              <a href="https://github.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors duration-300">GitHub</a>
              <a href="https://instagram.com/erhathaway" target="_blank" rel="noopener noreferrer" class="hover:text-copper transition-colors duration-300">Instagram</a>
              <a href="mailto:erhathaway@gmail.com" class="hover:text-copper transition-colors duration-300">Contact</a>
            </div>
            <div class="absolute right-8 top-1/2 -translate-y-1/2">
              <AuthButton inline onOpenModal={() => window.dispatchEvent(new Event('auth:open-login'))} />
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
