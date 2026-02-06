<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { onMount } from 'svelte';

  let { cardMode = false }: { cardMode?: boolean } = $props();

  // Only animate on initial mount, not when switching categories
  let mounted = $state(false);
  onMount(() => { mounted = true; });

  const pillStyle = $derived.by(() => {
    if (cardMode) {
      return 'background: rgba(245, 241, 235, 0.94);';
    }
    return 'background: radial-gradient(circle at bottom right, rgba(253, 218, 130, 0.3), rgba(255, 255, 255, 0.1) 60%, rgba(255, 255, 255, 0.1)); border: 1px solid rgba(160, 190, 210, 0.2);';
  });
</script>

<div class="flex flex-wrap gap-2">
  <button
    class="pill px-3 py-1.5 text-sm tracking-[0.2em] uppercase rounded-[1px] text-ash/70 backdrop-blur-[12px] hover:bg-walnut hover:text-cream transition-all duration-300 {!mounted && portfolio.selectedCategory !== 'all' ? 'animate-slide-up' : ''}"
    style="{pillStyle}{portfolio.selectedCategory === 'all' ? ' view-transition-name: category-back;' : ''}"
    class:active={portfolio.selectedCategory === 'all'}
    onclick={() => portfolio.setCategory('all')}
  >
    All
  </button>
  {#each portfolio.categories as category (category.name)}
    {@const isActive = portfolio.selectedCategory === category.displayName}
    <button
      class="pill px-3 py-1.5 text-sm tracking-[0.2em] uppercase rounded-[1px] text-ash/70 backdrop-blur-[12px] hover:bg-walnut hover:text-cream transition-all duration-300 {!mounted && !isActive ? 'animate-slide-up' : ''}"
      style="{pillStyle}{isActive ? ' view-transition-name: category-back;' : ''}"
      class:active={isActive}
      onclick={() => portfolio.setCategory(category.displayName)}
    >
      {category.displayName}
    </button>
  {/each}
</div>
