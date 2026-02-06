<script lang="ts">
  import type { PortfolioItem } from '$lib/data/items';

  let {
    item,
    variant = 'inline'
  }: { item: PortfolioItem; variant?: 'inline' | 'tile' } = $props();

  function formatMetadata(key: string, value: string): string {
    return value;
  }

  const isTile = $derived(variant === 'tile');

  const wrapperClass = $derived.by(() => {
    if (variant === 'tile') {
      return 'relative w-full h-full text-walnut flex items-center overflow-hidden';
    }
    return 'hover-inline-card text-walnut py-12 flex items-center';
  });

  const innerClass = $derived.by(() => {
    if (variant === 'tile') {
      return 'w-full px-7 py-8';
    }
    return 'hover-inline-inner w-full';
  });

  const titleClass = $derived.by(() =>
    isTile
      ? 'font-display text-2xl sm:text-3xl font-semibold leading-tight mb-3 vt-exclude-namecard'
      : 'font-display text-3xl font-semibold text-walnut leading-tight mb-4 vt-exclude-namecard'
  );
  const descriptionClass = $derived.by(() =>
    isTile
      ? 'text-sm sm:text-base leading-relaxed mb-5 vt-exclude-namecard'
      : 'text-base text-ash leading-relaxed mb-6 vt-exclude-namecard'
  );
  const metaKeyClass = $derived.by(() =>
    isTile ? 'text-[10px] tracking-wider uppercase' : 'text-[10px] tracking-wider uppercase text-ash'
  );
  const metaValueClass = $derived.by(() => (isTile ? 'font-display text-base' : 'font-display text-base text-walnut'));

  const tileLineStyle = '-webkit-box-decoration-break: clone; box-decoration-break: clone;';
</script>

{#if item}
  <div class={wrapperClass}>
    <div class={innerClass}>
      <div class="project-header-block text-left">
      <p class="text-[10px] font-medium tracking-widest uppercase text-copper mb-3 vt-exclude-namecard" style="view-transition-name: hover-info-category;">
        {#if isTile}
          <span class="inline bg-white/95 text-copper px-2 py-1" style={tileLineStyle}>
            {item.categories.join(' · ') || 'Uncategorized'}
          </span>
        {:else}
          {item.categories.join(' · ') || 'Uncategorized'}
        {/if}
      </p>
      <h3 class={titleClass} style="view-transition-name: hover-info-title;">
        {#if isTile}
          <span
            class="inline-block px-2 py-1"
            style="{tileLineStyle} background: #1A1714; color: #F5F1EB;"
          >
            {item.name}
          </span>
        {:else}
          {item.name}
        {/if}
      </h3>
      {#if item.description?.trim()}
        <p class={descriptionClass} style="view-transition-name: hover-info-description;">
          {#if isTile}
            <span class="inline bg-white/95 text-ash px-2 py-1" style={tileLineStyle}>
              {item.description}
            </span>
          {:else}
            {item.description}
          {/if}
        </p>
      {/if}
      {#if item.metadata}
        <div class="flex gap-8 vt-exclude-namecard justify-start text-left" style="view-transition-name: hover-info-meta;">
          {#each Object.entries(item.metadata) as [key, value] (key)}
            <div class="flex flex-col gap-1 items-start">
              {#if isTile}
                <span class="{metaKeyClass} inline bg-white/95 text-ash px-2 py-1" style={tileLineStyle}>{key}</span>
                <span class="{metaValueClass} inline bg-white/95 text-walnut px-2 py-1" style={tileLineStyle}>{formatMetadata(key, value)}</span>
              {:else}
                <span class={metaKeyClass}>{key}</span>
                <span class={metaValueClass}>{formatMetadata(key, value)}</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
      </div>
    </div>
  </div>
{/if}
