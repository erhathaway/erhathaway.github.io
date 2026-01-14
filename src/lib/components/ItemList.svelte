<script lang="ts">
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { page } from '$app/stores';

  let { scrollContainer }: { scrollContainer: HTMLElement | null } = $props();

  const hoveredItem = $derived(portfolio.hoveredItem);
  let itemEls = $state<Record<number, HTMLElement | null>>({});

  // Get the active project ID from the URL
  const activeProjectId = $derived.by(() => {
    const match = $page.url.pathname.match(/^\/project\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  });

  function storeEl(id: number) {
    return (node: HTMLElement) => {
      itemEls[id] = node;
      return () => {
        itemEls[id] = null;
      };
    };
  }

  $effect(() => {
    const id = hoveredItem?.id;
    if (!id || !scrollContainer) return;
    const node = itemEls[id];
    if (!node) return;
    scrollContainer.scrollTop = node.offsetTop;
  });
</script>

<ul class="space-y-2.5">
  {#each portfolio.filteredItems as item (item.id)}
    {@const isActive = activeProjectId === item.id}
    {@const isHovered = hoveredItem?.id === item.id}
    <li {@attach storeEl(item.id)}>
      <a
        href="/project/{item.id}"
        class="item-link text-sm hover:text-copper transition-colors view-transition-item {isActive ? 'text-copper font-medium' : 'text-walnut'} {isHovered ? 'block' : 'inline-block pb-0.5'}"
        class:active={isActive || isHovered}
        aria-current={isActive ? 'page' : undefined}
      >
        {#if isHovered}
          <HoverInfo item={item} />
        {:else}
          {item.name}
        {/if}
      </a>
    </li>
  {/each}
</ul>
