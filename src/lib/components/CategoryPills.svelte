<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import type { Category } from '$lib/data/items';

  const categories: Array<{ value: Category | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'wood', label: 'Wood' },
    { value: 'food', label: 'Food' },
    { value: 'other', label: 'Other' }
  ];
</script>

<div class="flex flex-wrap gap-2">
  {#each categories as category (category.value)}
    <button
      class="pill px-3 py-1.5 text-sm tracking-[0.2em] uppercase border border-walnut/2 rounded-full transition-all duration-300 bg-white/50 text-ash/70 backdrop-blur-md hover:bg-walnut hover:text-cream"
      class:active={portfolio.selectedCategory === category.value}
      onclick={() => portfolio.setCategory(category.value)}
    >
      {category.label}
    </button>
  {/each}
</div>
