<script lang="ts">
  import type { PageData } from './$types';
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import ArtifactView from '$lib/components/artifacts/ArtifactView.svelte';
  import { getImageSources, replaceExtension } from '$lib/utils/image-formats';
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

  // Non-cover published artifacts (hide cover if it exists)
  const hasCover = $derived(!!item?.image);
  const additionalArtifacts = $derived(hasCover ? artifacts.filter(a => !a.isCover) : artifacts);

  // Masonry: preload images to get aspect ratios, then distribute into shortest column
  let columnItems = $state<[Artifact[], Artifact[]]>([[], []]);

  function getImageUrl(artifact: Artifact): string | null {
    if (artifact.schema !== 'image-v1') return null;
    const blob = artifact.dataBlob as Record<string, unknown> | null;
    return typeof blob?.imageUrl === 'string' ? blob.imageUrl : null;
  }

  function distributeByAspectRatios(items: Artifact[], ratios: Map<number, number>): [Artifact[], Artifact[]] {
    const cols: [Artifact[], Artifact[]] = [[], []];
    const heights = [0, 0];
    for (const item of items) {
      const shorter = heights[0] <= heights[1] ? 0 : 1;
      cols[shorter].push(item);
      heights[shorter] += ratios.get(item.id) ?? 1;
    }
    return cols;
  }

  async function computeMasonry(items: Artifact[]) {
    if (items.length === 0) {
      columnItems = [[], []];
      return;
    }

    const ratios = new Map<number, number>();

    // Preload all images in parallel to get natural dimensions
    await Promise.all(items.map((item) => {
      const url = getImageUrl(item);
      if (!url) {
        ratios.set(item.id, 1);
        return;
      }
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ratios.set(item.id, img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1);
          resolve();
        };
        img.onerror = () => {
          ratios.set(item.id, 1);
          resolve();
        };
        img.src = url;
      });
    }));

    columnItems = distributeByAspectRatios(items, ratios);
  }

  $effect(() => {
    computeMasonry(additionalArtifacts);
  });

  // Reload artifacts whenever the project changes
  $effect(() => {
    loadArtifacts(data.projectId);
  });

  let mainEl = $state<HTMLElement | null>(null);

  const currentIndex = $derived(portfolio.filteredItems.findIndex(i => i.id === data.projectId));
  const hasPrev = $derived(currentIndex > 0);
  const hasNext = $derived(currentIndex >= 0 && currentIndex < portfolio.filteredItems.length - 1);

  function handleKeydown(e: KeyboardEvent) {
    // Don't hijack browser back/forward (Cmd+Arrow) or any modified arrow keys
    if (e.metaKey || e.ctrlKey) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const offset = e.key === 'ArrowLeft' ? -1 : 1;
      const nextIndex = currentIndex + offset;
      if (nextIndex >= 0 && nextIndex < portfolio.filteredItems.length) {
        goto(`/project/${portfolio.filteredItems[nextIndex].id}`);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!mainEl) return;
      e.preventDefault();
      const fast = e.shiftKey || e.altKey;
      const amount = (e.key === 'ArrowUp' ? -1 : 1) * (fast ? window.innerHeight : 200);
      mainEl.scrollBy({ top: amount, behavior: 'smooth' });
    }
  }

  // Clear hover state when landing on a project page
  onMount(() => {
    portfolio.hoveredItemId = null;
    // Ensure projects are loaded if arriving directly
    if (portfolio.allItems.length === 0 && !portfolio.loading) {
      portfolio.loadProjects();
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<svelte:head>
  {#if data.meta}
    {@const year = data.meta.year ? ` (${data.meta.year})` : ''}
    {@const desc = data.meta.description
      ? `${data.meta.name}${year} — ${data.meta.description}`
      : `${data.meta.name}${year} by Ethan Hathaway.`}
    {@const ogImage = data.meta.coverImageUrl
      ? `${data.origin}${data.meta.coverImageFormats?.includes('webp') ? replaceExtension(data.meta.coverImageUrl, 'webp') : data.meta.coverImageUrl}`
      : null}
    <title>{data.meta.name} — Ethan Hathaway</title>
    <meta name="description" content={desc} />
    <meta property="og:title" content={data.meta.name} />
    <meta property="og:description" content={desc} />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="{data.origin}/project/{data.projectId}" />
    {#if ogImage}
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={ogImage} />
    {/if}
    <meta name="twitter:title" content={data.meta.name} />
    <meta name="twitter:description" content={desc} />
  {:else}
    <meta name="description" content="A project by Ethan Hathaway." />
  {/if}
</svelte:head>

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
<main bind:this={mainEl} class="h-screen overflow-y-auto bg-charcoal" style="border-left: 1px solid #00000024;">
    <!-- Hero: text + cover side by side -->
    <div class="flex min-h-screen items-center">
      <!-- Left: project info -->
      <div class="w-80 shrink-0 self-stretch flex flex-col p-8 pt-10">
        <a href="/" class="inline-flex items-center gap-2 text-ash hover:text-copper transition-colors mb-10 text-sm" onclick={(event) => {
          event.preventDefault();
          goto('/', { state: { hoverId: item.id } });
        }}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </a>

        <div class="flex-1 flex flex-col justify-center">
          <p class="text-[10px] font-medium tracking-widest uppercase mb-3 vt-exclude-namecard" style="color: #a08e7a;">
            {item.categories.join(' · ') || 'Uncategorized'}
          </p>
          <h1 class="text-3xl leading-tight mb-5 vt-exclude-namecard" style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 400; letter-spacing: 0.02em; color: #3d2e1e;">
            {item.name}
          </h1>
          {#if item.description}
            <p class="text-sm leading-loose mb-8 vt-exclude-namecard" style="font-family: 'DM Sans', sans-serif; color: #6b5c4f; letter-spacing: 0.01em;">
              {item.description}
            </p>
          {/if}
          {#if Object.keys(item.metadata).length > 0}
            <div class="flex flex-col gap-4 vt-exclude-namecard">
              {#each Object.entries(item.metadata) as [key, value] (key)}
                <div class="flex flex-col gap-1.5">
                  <span class="text-[11px] tracking-[0.2em] uppercase" style="color: #a08e7a;">{key}</span>
                  <span class="text-base" style="font-family: 'Cormorant Garamond', Georgia, serif; color: #3d2e1e;">{value}</span>
                </div>
              {/each}
            </div>
          {/if}

        </div>
      </div>

      <!-- Right: cover image -->
      <div class="flex-1 min-w-0 flex items-center justify-center p-8">
        <div
          class="group relative h-[67vh] aspect-square max-w-full overflow-hidden rounded-lg vt-exclude-namecard"
          style="view-transition-name: project-image-{item.id}"
        >
          {#if item.hoverImage || item.image}
            {@const coverSrc = item.hoverImage || item.image}
            {@const coverFormats = item.hoverImage ? item.hoverImageFormats : item.imageFormats}
            {#if coverFormats?.length}
              <picture>
                {#each getImageSources(coverSrc, coverFormats) as source (source.type)}
                  <source srcset={source.srcset} type={source.type} />
                {/each}
                <img
                  src={coverSrc}
                  alt={item.name}
                  class="w-full h-full object-cover"
                  style:object-position="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
                  style:transform="scale({item.coverPosition?.zoom ?? 1})"
                  style:transform-origin="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
                  loading="lazy"
                />
              </picture>
            {:else}
              <img
                src={coverSrc}
                alt={item.name}
                class="w-full h-full object-cover"
                style:object-position="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
                style:transform="scale({item.coverPosition?.zoom ?? 1})"
                style:transform-origin="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
                loading="lazy"
              />
            {/if}
          {:else}
            <div class="placeholder-bg w-full h-full relative bg-gradient-to-br {item.gradientColors}"></div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Scroll up/down arrows -->
    <div class="sticky bottom-4 left-4 z-10 ml-4 flex flex-col gap-1 w-fit">
      <button
        type="button"
        class="p-1.5 rounded-lg text-cream/30 hover:text-cream/60 transition-colors duration-150"
        onclick={() => mainEl?.scrollBy({ top: -200, behavior: 'smooth' })}
        aria-label="Scroll up"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        type="button"
        class="p-1.5 rounded-lg text-cream/30 hover:text-cream/60 transition-colors duration-150"
        onclick={() => mainEl?.scrollBy({ top: 200, behavior: 'smooth' })}
        aria-label="Scroll down"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <!-- Additional artifacts (masonry: shortest-column placement) -->
    {#if additionalArtifacts.length > 0}
      <div class="max-w-6xl mx-auto p-8">
        <div class="grid grid-cols-2 gap-4 items-start mb-12">
          {#each [0, 1] as col (col)}
            <div class="flex flex-col gap-4">
              {#each columnItems[col] as artifact (artifact.id)}
                <ArtifactView schema={artifact.schema} data={artifact.dataBlob} />
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {/if}
</main>
{/key}
{/if}
