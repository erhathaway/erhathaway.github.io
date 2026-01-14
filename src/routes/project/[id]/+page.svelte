<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<main class="h-screen overflow-y-auto bg-charcoal">
    <div class="max-w-6xl mx-auto p-8">
      <!-- Back button -->
      <a href="/" class="inline-flex items-center gap-2 text-cream/60 hover:text-cream transition-colors mb-8">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to gallery
      </a>

      <!-- Project header -->
      <div class="mb-12">
        <p class="text-sm font-medium tracking-widest uppercase text-copper mb-4">
          {data.item.category === 'food' ? 'Food' : data.item.category === 'wood' ? 'Wood' : 'Other'} · {data.item.subcategory}
        </p>
        <h1 class="font-display text-5xl font-normal text-cream mb-6">
          {data.item.name}
        </h1>
        <p class="text-lg text-cream/80 leading-relaxed max-w-3xl">
          {data.item.description}
        </p>
      </div>

      <!-- Large placeholder image -->
      <div
        class="relative aspect-[16/9] overflow-hidden rounded-lg mb-12"
        style="view-transition-name: project-image-{data.item.id}"
      >
        <div class="placeholder-bg w-full h-full relative bg-gradient-to-br {data.item.gradientColors}"></div>
      </div>

      <!-- Project details -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        {#each Object.entries(data.item.metadata) as [key, value]}
          <div>
            <p class="text-xs tracking-wider uppercase text-cream/50 mb-2">{key}</p>
            <p class="font-display text-xl text-cream">{value}</p>
          </div>
        {/each}
      </div>

      <!-- Additional images grid -->
      <div class="grid grid-cols-2 gap-4 mb-12">
        <div class="relative aspect-square overflow-hidden rounded-lg">
          <div class="placeholder-bg w-full h-full relative bg-gradient-to-br {data.item.gradientColors} opacity-80"></div>
        </div>
        <div class="relative aspect-square overflow-hidden rounded-lg">
          <div class="placeholder-bg w-full h-full relative bg-gradient-to-br {data.item.gradientColors} opacity-60"></div>
        </div>
      </div>
    </div>
</main>

<style>
  /* View Transitions API styles */
  :global(::view-transition-old(root),
  ::view-transition-new(root)) {
    animation-duration: 0.3s;
  }

  :global(::view-transition-old(root)) {
    animation-name: fade-out;
  }

  :global(::view-transition-new(root)) {
    animation-name: fade-in;
  }

  @keyframes fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>