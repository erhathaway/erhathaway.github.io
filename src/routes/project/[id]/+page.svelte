<script lang="ts">
  import type { PageData } from './$types';
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import ArtifactView from '$lib/components/artifacts/ArtifactView.svelte';
  let { data }: { data: PageData } = $props();

  const item = $derived(portfolio.allItems.find(i => i.id === data.projectId));

  type Artifact = { id: number; schema: string; dataBlob: unknown; isCover: boolean };
  let artifacts: Artifact[] = $state([]);

  async function loadArtifacts(projectId: number) {
    try {
      const res = await fetch(`/api/projects/${projectId}/artifacts`);
      if (res.ok) {
        artifacts = await res.json();
      }
    } catch {
      // best-effort
    }
  }

  // Non-cover published artifacts
  const additionalArtifacts = $derived(artifacts.filter(a => !a.isCover));

  // Reload artifacts whenever the project changes
  $effect(() => {
    loadArtifacts(data.projectId);
  });

  // Clear hover state when landing on a project page
  onMount(() => {
    portfolio.hoveredItemId = null;
    // Ensure projects are loaded if arriving directly
    if (portfolio.allItems.length === 0 && !portfolio.loading) {
      portfolio.loadProjects();
    }
  });
</script>

{#if !item}
  <main class="h-screen flex items-center justify-center bg-charcoal">
    {#if portfolio.loading}
      <p class="text-cream/50 text-sm">Loading...</p>
    {:else}
      <p class="text-cream/50 text-sm">Project not found</p>
    {/if}
  </main>
{:else}
{#key item.id}
<main class="h-screen overflow-y-auto bg-charcoal">
    <!-- Project header that matches hover info styling -->
    <div class="bg-cream text-walnut">
      <div class="max-w-6xl mx-auto project-header-wrap">
        <a href="/" class="project-header-back inline-flex items-center gap-2 text-ash hover:text-copper transition-colors" onclick={(event) => {
          event.preventDefault();
          goto('/', { state: { hoverId: item.id } });
        }}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to gallery
        </a>

        <div class="project-header-block">
          <p class="text-[10px] font-medium tracking-widest uppercase text-copper mb-3 vt-exclude-namecard" style="view-transition-name: hover-info-category;">
            {item.categories.join(' · ') || 'Uncategorized'}
          </p>
          <h1 class="font-display text-3xl font-semibold text-walnut leading-tight mb-4 vt-exclude-namecard" style="view-transition-name: hover-info-title;">
            {item.name}
          </h1>
          <p class="text-base text-ash leading-relaxed mb-6 vt-exclude-namecard" style="view-transition-name: hover-info-description;">
            {item.description}
          </p>
          {#if Object.keys(item.metadata).length > 0}
            <div class="flex gap-8 vt-exclude-namecard" style="view-transition-name: hover-info-meta;">
              {#each Object.entries(item.metadata) as [key, value] (key)}
                <div class="flex flex-col gap-1">
                  <span class="text-[10px] tracking-wider uppercase text-ash">{key}</span>
                  <span class="font-display text-base text-walnut">{value}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto p-8">

      <!-- Large image -->
      <div
        class="relative aspect-[16/9] overflow-hidden rounded-lg mb-12 vt-exclude-namecard"
        style="view-transition-name: project-image-{item.id}"
      >
        {#if item.image}
          <img
            src={item.image}
            alt={item.name}
            class="w-full h-full object-cover"
            loading="lazy"
          />
        {:else}
          <div class="placeholder-bg w-full h-full relative bg-gradient-to-br {item.gradientColors}"></div>
        {/if}
      </div>

      <!-- Project details -->
      {#if Object.keys(item.metadata).length > 0}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        {#each Object.entries(item.metadata) as [key, value] (key)}
          <div>
            <p class="text-xs tracking-wider uppercase text-cream/50 mb-2">{key}</p>
            <p class="font-display text-xl text-cream">{value}</p>
          </div>
        {/each}
      </div>
      {/if}

      <!-- Additional artifacts -->
      {#if additionalArtifacts.length > 0}
        <div class="columns-2 gap-4 mb-12">
          {#each additionalArtifacts as artifact (artifact.id)}
            <div class="mb-4 break-inside-avoid">
              <ArtifactView schema={artifact.schema} data={artifact.dataBlob} />
            </div>
          {/each}
        </div>
      {/if}
    </div>
</main>
{/key}
{/if}
