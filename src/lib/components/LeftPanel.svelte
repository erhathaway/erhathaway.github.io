<script lang="ts">
  import CategoryPills from './CategoryPills.svelte';
  import ItemList from './ItemList.svelte';
  import HoverInfo from './HoverInfo.svelte';
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { page } from '$app/stores';

  const isHovering = $derived(!!portfolio.hoveredItem);
  const isProjectPage = $derived($page.route.id?.includes('/project/'));
  const isAdminPage = $derived($page.route.id?.includes('/admin'));
</script>

<aside class="w-80 min-w-[320px] h-screen bg-cream text-walnut flex flex-col relative">
  <!-- Fixed Header - Always on top -->
  <div class="p-8 pb-0 z-30 relative bg-cream" style="view-transition-name: header-name">
    <a href="/" class="font-display text-2xl font-normal text-walnut no-underline leading-tight mb-1 block animate-slide-up" style="animation-delay: 0.1s; view-transition-name: site-name">
      Ethan<br>Hathaway
    </a>
  </div>

  <!-- Main Content Area -->
  {#if !isHovering || isProjectPage || isAdminPage}
    <div class="flex-1 flex flex-col p-8 pt-4 relative z-0 min-h-0">
      <p class="text-xs tracking-widest uppercase text-ash mb-8 animate-slide-up" style="animation-delay: 0.2s">
        Things I Make
      </p>

      <!-- Category Pills -->
      <div class="mb-6 animate-slide-up" style="animation-delay: 0.3s">
        <CategoryPills />
      </div>

      <!-- Scrollable Navigation Area -->
      <nav class="flex-1 overflow-y-auto animate-slide-up min-h-0 scrollbar-hide" style="animation-delay: 0.4s">
        <ItemList />

        <!-- Admin Link (scrolls with content) -->
        <div class="pt-6 mt-6 border-t border-walnut/5">
          <a href="/admin" class="text-xs tracking-wider uppercase text-ash hover:text-copper transition-colors opacity-50 hover:opacity-100">Admin</a>
        </div>

        <!-- Social Links (scrolls with content) -->
        <div class="pt-6 mt-6 border-t border-walnut/5">
          <div class="flex gap-6">
            <a href="https://github.com" class="text-xs tracking-wider uppercase text-ash hover:text-copper transition-colors">GitHub</a>
            <a href="https://instagram.com" class="text-xs tracking-wider uppercase text-ash hover:text-copper transition-colors">Instagram</a>
            <a href="mailto:contact@example.com" class="text-xs tracking-wider uppercase text-ash hover:text-copper transition-colors">Contact</a>
          </div>
        </div>
      </nav>
    </div>
  {:else}
    <!-- Empty space when hovering on gallery page -->
    <div class="flex-1"></div>
  {/if}

  <!-- Hover Info Overlay (only on gallery page) -->
  {#if !isProjectPage && !isAdminPage}
    <HoverInfo />
  {/if}
</aside>