<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';

  const item = $derived(portfolio.hoveredItem);

  function formatMetadata(key: string, value: string): string {
    return value;
  }
</script>

<div class="hover-info-default absolute top-0 left-0 right-0" class:hidden={item}>
  <p class="font-display text-base italic text-ash leading-relaxed">
    Hover over an item to see more details about what I made.
  </p>
</div>

{#if item}
  <div class="hover-info-content visible absolute top-0 left-0 right-0">
    <p class="text-[10px] font-medium tracking-widest uppercase text-copper mb-2">
      {item.category === 'food' ? 'Food' : item.category === 'wood' ? 'Wood' : 'Other'} · {item.subcategory}
    </p>
    <h3 class="font-display text-xl font-normal text-walnut leading-tight mb-2">
      {item.name}
    </h3>
    <p class="text-sm text-ash leading-relaxed mb-3">
      {item.description}
    </p>
    {#if item.metadata}
      <div class="flex gap-6">
        {#each Object.entries(item.metadata) as [key, value]}
          <div class="flex flex-col gap-0.5">
            <span class="text-[10px] tracking-wider uppercase text-ash">{key}</span>
            <span class="font-display text-sm text-walnut">{formatMetadata(key, value)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}