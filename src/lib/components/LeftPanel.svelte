<script lang="ts">
  import CategoryPills from './CategoryPills.svelte';
  import ItemList from './ItemList.svelte';
  import { page } from '$app/stores';

  let { isOpen = $bindable(false) }: { isOpen?: boolean } = $props();

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

<aside class="w-full h-full text-walnut flex flex-col relative max-xl:animate-slide-in-left" style="background: linear-gradient(to right, rgba(245, 241, 235, 0.9) 0%, rgba(245, 241, 235, 0.7) 15%, rgba(245, 241, 235, 0.4) 35%, rgba(245, 241, 235, 0.1) 60%, transparent 80%)">
  <!-- Mobile close button - only show below 400px -->
  <button
    onclick={() => isOpen = false}
    class="min-[400px]:hidden absolute top-4 right-4 z-[110] p-2 bg-white/50 backdrop-blur-sm rounded-lg"
  >
    <svg class="w-5 h-5 text-walnut" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
  <!-- Fixed Header - Always on top -->
  <div class="p-8 pt-10 pb-0 z-30 relative bg-transparent" style="view-transition-name: header-name">
    <a href="/" class="text-[38px] font-normal text-walnut no-underline leading-[1.2] mb-3 block animate-slide-up" style="animation-delay: 0.1s; view-transition-name: site-name; font-family: 'Times New Roman', Times, serif;">
      Ethan<br>Hathaway
    </a>
  </div>

  <!-- Main Content Area -->
  <div class="flex-1 flex flex-col p-8 pt-4 relative z-0 min-h-0">
    <p class="text-[11px] tracking-[0.32em] uppercase text-ash/80 animate-slide-up" style="animation-delay: 0.2s">
      Things I Make
    </p>

    <!-- Scrollable Navigation Area -->
    <nav class="flex-1 overflow-y-auto animate-slide-up min-h-0 max-h-full scrollbar-hide pt-12 pb-[50%] -mx-8 mt-10" style="animation-delay: 0.4s" {@attach storeNav}>
      <ItemList scrollContainer={navEl} />

      <!-- Admin Link (scrolls with content) -->
    </nav>
  </div>

</aside>
