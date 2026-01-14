<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';

  let hoveredId = $state<number | null>(null);

  function handleMouseEnter(id: number) {
    hoveredId = id;
    portfolio.setHoveredItem(id);
  }

  function handleMouseLeave() {
    hoveredId = null;
    portfolio.setHoveredItem(null);
  }
</script>

<ul class="space-y-2.5">
  {#each portfolio.filteredItems as item}
    <li>
      <a
        href="#{item.id}"
        class="item-link text-sm text-walnut hover:text-copper transition-colors inline-block pb-0.5"
        class:active={hoveredId === item.id}
        onmouseenter={() => handleMouseEnter(item.id)}
        onmouseleave={handleMouseLeave}
      >
        {item.name}
      </a>
    </li>
  {/each}
</ul>