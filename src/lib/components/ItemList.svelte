<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { page } from '$app/stores';

  let hoveredId = $state<number | null>(null);

  // Get the active project ID from the URL
  const activeProjectId = $derived(() => {
    const match = $page.url.pathname.match(/^\/project\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  });

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
    {@const isActive = activeProjectId() === item.id}
    <li>
      <a
        href="/project/{item.id}"
        class="item-link text-sm hover:text-copper transition-colors inline-block pb-0.5 view-transition-item {isActive ? 'text-copper font-medium' : 'text-walnut'}"
        class:active={hoveredId === item.id || isActive}
        onmouseenter={() => handleMouseEnter(item.id)}
        onmouseleave={handleMouseLeave}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.name}
      </a>
    </li>
  {/each}
</ul>