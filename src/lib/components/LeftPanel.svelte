<script lang="ts">
  import CategoryPills from './CategoryPills.svelte';
  import ItemList from './ItemList.svelte';
  import { page } from '$app/stores';

  const isProjectPage = $derived($page.route.id?.includes('/project/'));
  const isAdminPage = $derived($page.route.id?.includes('/admin'));
  let navEl = $state<HTMLElement | null>(null);

  function storeNav(node: HTMLElement) {
    navEl = node;
    return () => {
      navEl = null;
    };
  }
</script>

<aside class="w-80 min-w-[320px] h-screen bg-cream text-walnut flex flex-col relative">
  <!-- Fixed Header - Always on top -->
  <div class="p-8 pb-0 z-30 relative bg-cream" style="view-transition-name: header-name">
    <a href="/" class="font-display text-2xl font-normal text-walnut no-underline leading-tight mb-1 block animate-slide-up" style="animation-delay: 0.1s; view-transition-name: site-name">
      Ethan<br>Hathaway
    </a>
  </div>

  <!-- Main Content Area -->
  <div class="flex-1 flex flex-col p-8 pt-4 relative z-0 min-h-0">
    <p class="text-xs tracking-widest uppercase text-ash mb-8 animate-slide-up" style="animation-delay: 0.2s">
      Things I Make
    </p>

    <!-- Scrollable Navigation Area -->
    <nav class="flex-1 overflow-y-auto animate-slide-up min-h-0 scrollbar-hide pt-4 -mx-8" style="animation-delay: 0.4s" {@attach storeNav}>
      <ItemList scrollContainer={navEl} />

      <!-- Admin Link (scrolls with content) -->
      <!-- Social Links (scrolls with content) -->
      <div class="pt-6 mt-[50%] px-8 sticky bottom-0 bg-cream">
        <div class="h-px bg-walnut/5 mb-6"></div>
        <div class="flex gap-6 text-[11px] tracking-[0.18em] uppercase text-walnut/60">
          <a href="https://github.com" class="hover:text-copper transition-colors">GitHub</a>
          <a href="https://instagram.com" class="hover:text-copper transition-colors">Instagram</a>
          <a href="mailto:contact@example.com" class="hover:text-copper transition-colors">Contact</a>
        </div>
      </div>
    </nav>
  </div>

</aside>
