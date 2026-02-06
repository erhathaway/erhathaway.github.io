<script lang="ts">
  import type { PortfolioItem } from '$lib/data/items';

  let { item }: { item: PortfolioItem } = $props();

  function formatMetadata(key: string, value: string): string {
    return value;
  }
</script>

{#if item}
  <div class="hover-inline-card text-walnut py-12 flex items-center">
    <div class="hover-inline-inner w-full">
      <div class="project-header-block">
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
        <div class="flex gap-8 vt-exclude-namecard" style="view-transition-name: hover-info-meta;">
          {#each Object.entries(item.metadata) as [key, value] (key)}
            <div class="flex flex-col gap-1">
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
