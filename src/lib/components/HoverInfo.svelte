<script lang="ts">
  import type { PortfolioItem } from '$lib/data/items';

  let {
    item,
    variant = 'inline',
    dockSide = 'left'
  }: { item: PortfolioItem; variant?: 'inline' | 'tile'; dockSide?: 'left' | 'right' } = $props();

  function formatMetadata(key: string, value: string): string {
    return value;
  }

  const isTile = $derived(variant === 'tile');
  const tileClipPath = $derived.by(() =>
    dockSide === 'right'
      ? 'polygon(40% 0%, 100% 0%, 100% 100%, 56% 100%)'
      : 'polygon(0% 0%, 60% 0%, 44% 100%, 0% 100%)'
  );

  const wrapperClass = $derived.by(() => {
    if (variant === 'tile') {
      return 'relative w-full h-full text-walnut flex items-center overflow-hidden';
    }
    return 'hover-inline-card text-walnut py-12 flex items-center';
  });

  const innerClass = $derived.by(() => {
    if (variant === 'tile') {
      return dockSide === 'right' ? 'w-full pl-7 pr-8 py-8 flex justify-end' : 'w-full px-7 py-8 flex';
    }
    return 'hover-inline-inner w-full';
  });

  const projectHeaderClass = $derived.by(() => {
    if (!isTile) return 'project-header-block text-left';
    return dockSide === 'right' ? 'text-right' : 'text-left';
  });
  const projectHeaderStyle = $derived.by(() => {
    if (!isTile) return undefined;
    // Keep the text width inside the trapezoid on small tiles.
    return 'width: min(240px, 40%); max-width: min(240px, 40%);';
  });

  const titleClass = $derived.by(() =>
    isTile
      ? 'text-2xl sm:text-3xl font-semibold leading-tight mb-3 vt-exclude-namecard'
      : 'font-display text-3xl font-semibold text-walnut leading-tight mb-4 vt-exclude-namecard'
  );
  const descriptionClass = $derived.by(() =>
    isTile
      ? 'text-sm sm:text-base leading-relaxed mb-5 vt-exclude-namecard'
      : 'text-base text-ash leading-relaxed mb-6 vt-exclude-namecard'
  );
  const metaKeyClass = $derived.by(() =>
    isTile ? 'text-[10px] tracking-wider uppercase text-walnut' : 'text-[10px] tracking-wider uppercase text-ash'
  );
  const metaValueClass = $derived.by(() => (isTile ? 'font-display text-base text-walnut' : 'font-display text-base text-walnut'));

  const tileCategoryClass = $derived.by(() =>
    isTile
      ? 'text-[10px] font-medium tracking-widest uppercase text-walnut mb-3 vt-exclude-namecard'
      : 'text-[10px] font-medium tracking-widest uppercase text-copper mb-3 vt-exclude-namecard'
  );

  const tileTextWrapClass = $derived.by(() => {
    if (!isTile) return '';
    return dockSide === 'right' ? 'relative z-10 max-w-[72%] ml-auto' : 'relative z-10 max-w-[72%]';
  });
</script>

{#if item}
  <div class={wrapperClass}>
    {#if isTile}
      <div
        class="absolute inset-0 bg-white/95"
        style="clip-path: {tileClipPath};"
      ></div>
    {/if}
    <div class={innerClass}>
      <div class={projectHeaderClass} style={projectHeaderStyle}>
      <div class={tileTextWrapClass}>
        <p class={tileCategoryClass} style="view-transition-name: hover-info-category;">
          {item.categories.join(' · ') || 'Uncategorized'}
        </p>

        <h3 class={titleClass} style="view-transition-name: hover-info-title; font-family: 'Playfair Display', Georgia, serif;">
          {item.name}
        </h3>

        {#if item.description?.trim()}
          <p class={descriptionClass} style="view-transition-name: hover-info-description;">
            {item.description}
          </p>
        {/if}

        {#if item.metadata}
          <div class="flex gap-8 vt-exclude-namecard {dockSide === 'right' ? 'justify-end text-right' : 'justify-start text-left'}" style="view-transition-name: hover-info-meta;">
            {#each Object.entries(item.metadata) as [key, value] (key)}
              <div class="flex flex-col gap-1 {dockSide === 'right' ? 'items-end' : 'items-start'}">
                <span class={metaKeyClass}>{key}</span>
                <span class={metaValueClass}>{formatMetadata(key, value)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      </div>
    </div>
  </div>
{/if}
