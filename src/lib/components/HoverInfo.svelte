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
    isTile ? 'text-[10px] tracking-wider uppercase text-walnut' : 'text-[10px] tracking-wider uppercase text-ash'
  );
  const metaValueClass = $derived.by(() => (isTile ? 'font-display text-base text-walnut' : 'font-display text-base text-walnut'));

  const tileCategoryClass = $derived.by(() =>
    isTile
      ? 'text-[10px] font-medium tracking-widest uppercase text-walnut mb-3 vt-exclude-namecard'
      : 'text-[10px] font-medium tracking-widest uppercase text-copper mb-3 vt-exclude-namecard'
  );
</script>

{#if item}
  <div class={wrapperClass}>
    {#if isTile}
      <div
        class="absolute inset-0 bg-white/95"
        style="clip-path: polygon(0% 0%, 60% 0%, 44% 100%, 0% 100%);"
      ></div>
    {/if}
    <div class={innerClass}>
      <div class="project-header-block text-left">
      <div class={isTile ? 'relative z-10 max-w-[72%]' : ''}>
        <p class={tileCategoryClass} style="view-transition-name: hover-info-category;">
          {item.categories.join(' · ') || 'Uncategorized'}
        </p>

        <h3 class={titleClass} style="view-transition-name: hover-info-title;">
          {item.name}
        </h3>

        {#if item.description?.trim()}
          <p class={descriptionClass} style="view-transition-name: hover-info-description;">
            {item.description}
          </p>
        {/if}

        {#if item.metadata}
          <div class="flex gap-8 vt-exclude-namecard justify-start text-left" style="view-transition-name: hover-info-meta;">
            {#each Object.entries(item.metadata) as [key, value] (key)}
              <div class="flex flex-col gap-1 items-start">
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
