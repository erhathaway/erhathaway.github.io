<script lang="ts">
  import CategoryPills from './CategoryPills.svelte';
  import ItemList from './ItemList.svelte';
  import HoverInfo from './HoverInfo.svelte';
  import { portfolio } from '$lib/stores/portfolio.svelte';

  const isHovering = $derived(!!portfolio.hoveredItem);
</script>

<aside class="w-80 min-w-[320px] h-screen bg-cream text-walnut flex flex-col relative">
  <!-- Fixed Header - Always on top -->
  <div class="p-8 pb-0 z-30 relative bg-cream" style="view-transition-name: header-name">
    <a href="/" class="font-display text-2xl font-normal text-walnut no-underline leading-tight mb-1 block animate-slide-up" style="animation-delay: 0.1s; view-transition-name: site-name">
      Ethan<br>Hathaway
    </a>
  </div>

  <!-- Main Content Area -->
  {#if !isHovering}
    <div class="flex-1 flex flex-col p-8 pt-4 relative z-0">
      <p class="text-xs tracking-widest uppercase text-ash mb-8 animate-slide-up" style="animation-delay: 0.2s">
        Things I Make
      </p>

      <!-- Category Pills -->
      <div class="mb-6 animate-slide-up" style="animation-delay: 0.3s">
        <CategoryPills />
      </div>

      <!-- Item List -->
      <nav class="flex-1 overflow-y-auto pr-2 animate-slide-up" style="animation-delay: 0.4s">
        <ItemList />
      </nav>
    </div>

    <!-- Footer -->
    <div class="p-6 border-t border-walnut/10 animate-fade-in z-0" style="animation-delay: 0.7s">
      <div class="flex gap-6">
        <a href="https://github.com" class="text-xs tracking-wider uppercase text-ash hover:text-copper transition-colors">GitHub</a>
        <a href="https://instagram.com" class="text-xs tracking-wider uppercase text-ash hover:text-copper transition-colors">Instagram</a>
        <a href="mailto:contact@example.com" class="text-xs tracking-wider uppercase text-ash hover:text-copper transition-colors">Contact</a>
      </div>
    </div>
  {:else}
    <!-- Empty space when hovering -->
    <div class="flex-1"></div>
  {/if}

  <!-- Hover Info Overlay -->
  <HoverInfo />
</aside>