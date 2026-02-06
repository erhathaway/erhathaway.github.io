<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { onMount } from 'svelte';
  import type { Category } from '$lib/data/items';

  const categories: Array<{ value: Category | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'wood', label: 'Wood' },
    { value: 'food', label: 'Food' },
    { value: 'other', label: 'Other' }
  ];

  // Only animate on initial mount, not when switching categories
  let mounted = $state(false);
  onMount(() => { mounted = true; });
</script>

<div class="flex flex-wrap gap-2">
  {#each categories as category, i (category.value)}
    {@const isActive = portfolio.selectedCategory === category.value}
    <button
      class="pill px-3 py-1.5 text-sm tracking-[0.2em] uppercase rounded-[3px] text-ash/70 backdrop-blur-[12px] hover:bg-walnut hover:text-cream transition-all duration-300 {!mounted && !isActive ? 'animate-slide-up' : ''}"
      style="background: radial-gradient(circle at bottom right, rgba(253, 218, 130, 0.3), rgba(255, 255, 255, 0.1) 60%, rgba(255, 255, 255, 0.1)); border: 1px solid rgba(160, 190, 210, 0.2);{isActive ? ' view-transition-name: category-back;' : ''}"
      class:active={isActive}
      onclick={() => portfolio.setCategory(category.value)}
    >
      {category.label}
    </button>
  {/each}
</div>
