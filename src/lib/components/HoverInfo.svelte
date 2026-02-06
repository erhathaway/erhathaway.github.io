<script lang="ts">
  import type { PortfolioItem } from '$lib/data/items';

  let {
    item,
    variant = 'inline',
    tileAlign = 'left'
  }: { item: PortfolioItem; variant?: 'inline' | 'tile'; tileAlign?: 'left' | 'right' } = $props();

  function formatMetadata(key: string, value: string): string {
    return value;
  }

  const wrapperClass = $derived.by(() => {
    if (variant === 'tile') {
      return 'w-full h-full text-walnut flex items-center';
    }
    return 'hover-inline-card text-walnut py-12 flex items-center';
  });

  const innerClass = $derived.by(() => {
    if (variant === 'tile') {
      return 'w-full px-7 py-8';
    }
    return 'hover-inline-inner w-full';
  });

  const blockAlignClass = $derived.by(() => {
    if (variant !== 'tile') return '';
    return tileAlign === 'right' ? 'ml-auto text-right' : 'text-left';
  });

  const metaAlignClass = $derived.by(() => {
    if (variant !== 'tile') return '';
    return tileAlign === 'right' ? 'justify-end text-right' : 'justify-start text-left';
  });
</script>

{#if item}
  <div
    class={wrapperClass}
    style={variant === 'tile'
      ? 'background: radial-gradient(circle at bottom right, #F5F1EB 0%, #FFFFFF 65%, #F5F1EB 100%);'
      : undefined}
  >
    <div class={innerClass}>
      <div class="project-header-block {blockAlignClass}">
      <p class="text-[10px] font-medium tracking-widest uppercase text-copper mb-3 vt-exclude-namecard" style="view-transition-name: hover-info-category;">
        {item.categories.join(' · ') || 'Uncategorized'}
      </p>
      <h3 class="font-display text-3xl font-semibold text-walnut leading-tight mb-4 vt-exclude-namecard" style="view-transition-name: hover-info-title;">
        {item.name}
      </h3>
      <p class="text-base text-ash leading-relaxed mb-6 vt-exclude-namecard" style="view-transition-name: hover-info-description;">
        {item.description}
      </p>
      {#if item.metadata}
        <div class="flex gap-8 vt-exclude-namecard {metaAlignClass}" style="view-transition-name: hover-info-meta;">
          {#each Object.entries(item.metadata) as [key, value] (key)}
            <div class="flex flex-col gap-1 {tileAlign === 'right' && variant === 'tile' ? 'items-end' : ''}">
              <span class="text-[10px] tracking-wider uppercase text-ash">{key}</span>
              <span class="font-display text-base text-walnut">{formatMetadata(key, value)}</span>
            </div>
          {/each}
        </div>
      {/if}
      </div>
    </div>
  </div>
{/if}
