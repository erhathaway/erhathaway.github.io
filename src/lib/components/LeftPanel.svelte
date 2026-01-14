<script lang="ts">
  import CategoryPills from './CategoryPills.svelte';
  import ItemList from './ItemList.svelte';
  import HoverInfo from './HoverInfo.svelte';
</script>

<aside class="w-80 min-w-[320px] h-screen bg-cream text-walnut flex flex-col">
  <div class="flex-1 flex flex-col p-8">
    <!-- Name -->
    <a href="/" class="font-display text-2xl font-normal text-walnut no-underline leading-tight mb-1 animate-slide-up" style="animation-delay: 0.1s">
      Ethan<br>Hathaway
    </a>
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

    <!-- Hover Info Area -->
    <div class="mt-auto pt-6 border-t border-walnut/10 min-h-[180px] relative animate-fade-in" style="animation-delay: 0.6s">
      <HoverInfo />
    </div>
  </div>

  <!-- Footer -->
  <div class="p-6 border-t border-walnut/10 animate-fade-in" style="animation-delay: 0.7s">
    <div class="flex gap-6">
      <a href="https://github.com" class="text-xs tracking-wider uppercase text-ash hover:text-copper transition-colors">GitHub</a>
      <a href="https://instagram.com" class="text-xs tracking-wider uppercase text-ash hover:text-copper transition-colors">Instagram</a>
      <a href="mailto:contact@example.com" class="text-xs tracking-wider uppercase text-ash hover:text-copper transition-colors">Contact</a>
    </div>
  </div>
</aside>