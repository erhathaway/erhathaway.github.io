<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';

  const item = $derived(portfolio.hoveredItem);

  function formatMetadata(key: string, value: string): string {
    return value;
  }
</script>

{#if item}
  <div class="absolute left-0 right-0 bottom-0 bg-cream z-20 flex flex-col transition-all duration-300 ease-out overflow-visible" style="top: 120px; background-color: #F5F1EB;">
    <div class="p-8 flex-1 flex flex-col animate-fade-in bg-cream overflow-visible">
      <div class="project-header-block">
        <p class="text-[10px] font-medium tracking-widest uppercase text-copper mb-3" style="view-transition-name: hover-info-category;">
          {item.category === 'food' ? 'Food' : item.category === 'wood' ? 'Wood' : 'Other'} · {item.subcategory}
        </p>
        <h3 class="font-display text-4xl font-normal text-walnut leading-tight mb-4" style="view-transition-name: hover-info-title;">
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
