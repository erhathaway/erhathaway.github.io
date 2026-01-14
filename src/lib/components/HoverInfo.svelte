<script lang="ts">
  import type { PortfolioItem } from '$lib/data/items';

  let { item }: { item: PortfolioItem } = $props();

  function formatMetadata(key: string, value: string): string {
    return value;
  }
</script>

{#if item}
  <div class="hover-inline-card text-walnut py-4" style="background-color: #F5F1EB;">
    <div class="hover-inline-inner">
      <div class="project-header-block">
      <p class="text-[10px] font-medium tracking-widest uppercase text-copper mb-3" style="view-transition-name: hover-info-category;">
        {item.category === 'food' ? 'Food' : item.category === 'wood' ? 'Wood' : 'Other'} · {item.subcategory}
      </p>
      <h3 class="font-display text-4xl font-medium text-walnut leading-tight mb-4" style="view-transition-name: hover-info-title;">
        {item.name}
      </h3>
      <p class="text-base text-ash leading-relaxed mb-6" style="view-transition-name: hover-info-description;">
        {item.description}
      </p>
      {#if item.metadata}
        <div class="flex gap-8" style="view-transition-name: hover-info-meta;">
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
