<script lang="ts">
  import type { PageData } from './$types';
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import ArtifactView from '$lib/components/artifacts/ArtifactView.svelte';
  import { getImageSources, getResponsiveSrcset, replaceExtension } from '$lib/utils/image-formats';
  let { data }: { data: PageData } = $props();

  const item = $derived(portfolio.allItems.find(i => i.slug === data.slug));

  type Artifact = { id: number; schema: string; dataBlob: unknown; isCover: boolean };
  let artifacts: Artifact[] = $state([]);

  async function loadArtifacts(projectId: number) {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/artifacts`);
      if (res.ok) {
        artifacts = await res.json();
      }
    } catch {
      // best-effort
    }
  }

  const FULL_WIDTH_SCHEMAS = ['divider-v1', 'section-title-v1', 'narrative-v1', 'dense-section-v1', 'enlarge-v1', 'cover-image-v1'];

  // Non-cover published artifacts (hide cover if it exists)
  const hasCover = $derived(!!item?.image);
  const additionalArtifacts = $derived(hasCover ? artifacts.filter(a => !a.isCover) : artifacts);

  // Segment artifacts into groups: masonry segments, dense masonry segments, enlarged images, and full-width breaks
  type Segment =
    | { type: 'masonry'; items: Artifact[] }
    | { type: 'dense-masonry'; items: Artifact[]; pairId: number }
    | { type: 'enlarged'; artifact: Artifact; widthPercent: number; align: string }
    | { type: 'break'; artifact: Artifact };

  // Detect which dense-section pairIds are nested inside another pair
  function findNestedPairIds(items: Artifact[]): Set<number> {
    const nested = new Set<number>();
    // First pass: find all dense-section markers and their positions
    const markers: { index: number; pairId: number }[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].schema === 'dense-section-v1') {
        const blob = items[i].dataBlob as Record<string, unknown> | null;
        const pid = typeof blob?.pairId === 'number' ? blob.pairId : -1;
        if (pid >= 0) markers.push({ index: i, pairId: pid });
      }
    }
    // Group markers by pairId — valid pairs have exactly 2 markers
    const pairMap = new Map<number, number[]>();
    for (const m of markers) {
      const arr = pairMap.get(m.pairId) ?? [];
      arr.push(m.index);
      pairMap.set(m.pairId, arr);
    }
    // For each valid pair, check if any other pair's both markers fall entirely within it
    const validPairs = [...pairMap.entries()].filter(([, idxs]) => idxs.length === 2);
    for (const [outerPid, outerIdxs] of validPairs) {
      const [oStart, oEnd] = [Math.min(...outerIdxs), Math.max(...outerIdxs)];
      for (const [innerPid, innerIdxs] of validPairs) {
        if (innerPid === outerPid) continue;
        const [iStart, iEnd] = [Math.min(...innerIdxs), Math.max(...innerIdxs)];
        if (iStart > oStart && iEnd < oEnd) {
          nested.add(innerPid);
        }
      }
    }
    return nested;
  }

  const nestingWarnings = $derived.by(() => {
    const nestedPids = findNestedPairIds(additionalArtifacts);
    return [...nestedPids].map(pid => `Dense Section #${pid} is nested inside another dense section and will be ignored.`);
  });

  function buildSegments(items: Artifact[]): Segment[] {
    const nestedPids = findNestedPairIds(items);

    const segments: Segment[] = [];
    let current: Artifact[] = [];
    let denseStack: { pairId: number; items: Artifact[] } | null = null;

    // Track which pairIds have valid pairs (exactly 2 markers)
    const pairCounts = new Map<number, number>();
    for (const a of items) {
      if (a.schema === 'dense-section-v1') {
        const blob = a.dataBlob as Record<string, unknown> | null;
        const pid = typeof blob?.pairId === 'number' ? blob.pairId : -1;
        pairCounts.set(pid, (pairCounts.get(pid) ?? 0) + 1);
      }
    }

    // Use index-based loop so enlarge-v1 can peek ahead
    let i = 0;
    while (i < items.length) {
      const artifact = items[i];

      if (artifact.schema === 'enlarge-v1') {
        // Look ahead for the next non-full-width artifact to enlarge
        const blob = artifact.dataBlob as Record<string, unknown> | null;
        const widthPercent = typeof blob?.widthPercent === 'number' ? blob.widthPercent : 50;
        const align = typeof blob?.align === 'string' ? blob.align : 'center';
        let found = false;
        for (let j = i + 1; j < items.length; j++) {
          if (!FULL_WIDTH_SCHEMAS.includes(items[j].schema)) {
            // Flush current masonry/dense before the enlarged image
            if (denseStack) {
              if (denseStack.items.length > 0) {
                segments.push({ type: 'dense-masonry', items: denseStack.items, pairId: denseStack.pairId });
                denseStack = { pairId: denseStack.pairId, items: [] };
              }
            } else if (current.length > 0) {
              segments.push({ type: 'masonry', items: current });
              current = [];
            }
            segments.push({ type: 'enlarged', artifact: items[j], widthPercent, align });
            i = j + 1; // skip past both the enlarger and the target
            found = true;
            break;
          }
        }
        if (!found) {
          i++; // orphan enlarger at end, skip it
        }
        continue;
      }

      if (artifact.schema === 'dense-section-v1') {
        const blob = artifact.dataBlob as Record<string, unknown> | null;
        const pid = typeof blob?.pairId === 'number' ? blob.pairId : -1;

        // Skip nested pairs — treat their markers as invisible
        if (nestedPids.has(pid)) { i++; continue; }

        // Skip orphan markers (not exactly 2)
        if ((pairCounts.get(pid) ?? 0) !== 2) { i++; continue; }

        if (denseStack === null) {
          // Opening a dense section
          if (current.length > 0) {
            segments.push({ type: 'masonry', items: current });
            current = [];
          }
          denseStack = { pairId: pid, items: [] };
        } else if (denseStack.pairId === pid) {
          // Closing the current dense section
          if (denseStack.items.length > 0) {
            segments.push({ type: 'dense-masonry', items: denseStack.items, pairId: pid });
          }
          denseStack = null;
        } else {
          // Different pair encountered while inside a dense section — shouldn't happen
          // if nesting detection is correct, but handle gracefully
          denseStack.items.push(artifact);
        }
      } else if (FULL_WIDTH_SCHEMAS.includes(artifact.schema)) {
        if (denseStack) {
          // Full-width break inside a dense section: flush dense, emit break, reopen dense
          if (denseStack.items.length > 0) {
            segments.push({ type: 'dense-masonry', items: denseStack.items, pairId: denseStack.pairId });
            denseStack = { pairId: denseStack.pairId, items: [] };
          }
          segments.push({ type: 'break', artifact });
        } else {
          if (current.length > 0) {
            segments.push({ type: 'masonry', items: current });
            current = [];
          }
          segments.push({ type: 'break', artifact });
        }
      } else {
        if (denseStack) {
          denseStack.items.push(artifact);
        } else {
          current.push(artifact);
        }
      }
      i++;
    }

    // Flush remaining
    if (denseStack && denseStack.items.length > 0) {
      segments.push({ type: 'dense-masonry', items: denseStack.items, pairId: denseStack.pairId });
    }
    if (current.length > 0) {
      segments.push({ type: 'masonry', items: current });
    }
    return segments;
  }

  const segments = $derived(buildSegments(additionalArtifacts));

  // Group segments into sections: each section-title break starts a new group.
  // segIdx is preserved so segmentColumns2 lookups still work.
  type SectionGroup = { segments: { segment: Segment; segIdx: number }[] };
  const sectionGroups = $derived.by(() => {
    const groups: SectionGroup[] = [];
    let current: SectionGroup = { segments: [] };
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isSectionTitle = seg.type === 'break' && seg.artifact.schema === 'section-title-v1';
      if (isSectionTitle && current.segments.length > 0) {
        groups.push(current);
        current = { segments: [] };
      }
      current.segments.push({ segment: seg, segIdx: i });
    }
    if (current.segments.length > 0) groups.push(current);
    return groups;
  });

  // Masonry: preload images to get aspect ratios, then distribute into shortest column
  let segmentColumns2 = $state<Map<number, Artifact[][]>>(new Map());
  let artifactRatios = $state<Map<number, number>>(new Map());
  let eagerIds = $state<Set<number>>(new Set());

  function getImageUrl(artifact: Artifact): string | null {
    if (artifact.schema !== 'image-v1') return null;
    const blob = artifact.dataBlob as Record<string, unknown> | null;
    return typeof blob?.imageUrl === 'string' ? blob.imageUrl : null;
  }

  function distributeIntoColumns(items: Artifact[], ratios: Map<number, number>, numCols: number): Artifact[][] {
    const MAX_RATIO = 1.4;
    const cols: Artifact[][] = Array.from({ length: numCols }, () => []);
    const heights = new Array(numCols).fill(0);
    for (const item of items) {
      let shortest = 0;
      for (let c = 1; c < numCols; c++) {
        if (heights[c] < heights[shortest]) shortest = c;
      }
      cols[shortest].push(item);
      heights[shortest] += Math.min(ratios.get(item.id) ?? 1, MAX_RATIO);
    }
    return cols;
  }

  async function computeAllMasonry(segs: Segment[]) {
    const masonrySegments = segs
      .map((seg, i) => ({ seg, i }))
      .filter((s): s is { seg: Extract<Segment, { type: 'masonry' }> | Extract<Segment, { type: 'dense-masonry' }>; i: number } =>
        s.seg.type === 'masonry' || s.seg.type === 'dense-masonry');

    if (masonrySegments.length === 0) {
      segmentColumns2 = new Map();
      return;
    }

    // Collect all image artifacts across all masonry segments
    const allItems = masonrySegments.flatMap(s => s.seg.items);
    const ratios = new Map<number, number>();

    await Promise.all(allItems.map((item) => {
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

    const next = new Map<number, Artifact[][]>();
    for (const { seg, i } of masonrySegments) {
      const numCols = seg.type === 'dense-masonry' ? 4 : 2;
      next.set(i, distributeIntoColumns(seg.items, ratios, numCols));
    }
    segmentColumns2 = next;
    artifactRatios = ratios;

    // Mark the first ~4 image artifacts as eager-load
    const eager = new Set<number>();
    for (const item of allItems) {
      if (eager.size >= 4) break;
      eager.add(item.id);
    }
    eagerIds = eager;
  }

  $effect(() => {
    computeAllMasonry(segments);
  });

  // Reload artifacts whenever the project changes
  $effect(() => {
    loadArtifacts(data.projectId);
  });

  let mainEl = $state<HTMLElement | null>(null);
  let hasScrolled = $state(false);
  let showScrollHint = $state(true);
  let coverEl = $state<HTMLElement | null>(null);
  let coverCenterX = $state(0);

  $effect(() => {
    if (!coverEl) return;
    function update() {
      if (!coverEl) return;
      const rect = coverEl.getBoundingClientRect();
      coverCenterX = rect.left + rect.width / 2;
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  });

  const currentIndex = $derived(portfolio.filteredItems.findIndex(i => i.slug === data.slug));
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
        goto(`/${portfolio.filteredItems[nextIndex].slug}`);
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

    // Detect user scroll to dismiss the wave animation on arrows
    function onScroll() {
      if (mainEl && mainEl.scrollTop > 20) {
        hasScrolled = true;
        mainEl.removeEventListener('scroll', onScroll);
      }
    }
    mainEl?.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      mainEl?.removeEventListener('scroll', onScroll);
    };
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
    <meta property="og:url" content="{data.origin}/{data.slug}" />
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
  <main class="h-screen flex flex-col items-center justify-center bg-charcoal gap-4">
    {#if portfolio.loading}
      <p class="text-cream/50 text-sm">Loading...</p>
    {:else}
      <p class="text-cream/50 text-sm">Project not found</p>
    {/if}
    <a href="/" class="inline-flex items-center gap-2 text-ash hover:text-copper transition-colors text-sm" onclick={(event) => {
      event.preventDefault();
      goto('/');
    }}>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </a>
  </main>
{:else}
{#key item.id}
<main bind:this={mainEl} class="h-screen overflow-y-auto bg-charcoal" style="border-left: 1px solid #00000024;">
    <!-- Hero: text + cover side by side -->
    <div class="relative flex flex-col lg:flex-row min-h-screen lg:items-center">
      <!-- Left: project info -->
      <div class="lg:w-64 shrink-0 self-stretch flex flex-col p-8 pt-10 pb-4 lg:pb-8">
        <a href="/" class="hidden lg:inline-flex items-center gap-2 text-ash hover:text-copper transition-colors mb-10 text-sm" onclick={(event) => {
          event.preventDefault();
          goto('/', { state: { hoverId: item.id } });
        }}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </a>

        <div class="flex-1 flex flex-col justify-center">
          <p class="hidden lg:block text-[10px] font-medium tracking-widest uppercase mb-3 vt-exclude-namecard" style="color: #a08e7a;">
            {item.categories.join(' · ') || 'Uncategorized'}
          </p>
          <h1 class="text-3xl leading-tight mb-2 lg:mb-5 vt-exclude-namecard" style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 400; letter-spacing: 0.02em; color: #3d2e1e;">
            {item.name}
          </h1>
          {#if item.description}
            <p class="text-sm leading-loose mb-8 pr-8 lg:pr-0 vt-exclude-namecard" style="font-family: 'DM Sans', sans-serif; color: #6b5c4f; letter-spacing: 0.01em;">
              {item.description}
            </p>
          {/if}
          {#if Object.keys(item.metadata).length > 0}
            <div class="flex flex-row flex-wrap gap-x-6 gap-y-4 lg:flex-col lg:gap-4 vt-exclude-namecard">
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
      <div class="flex-1 flex items-center justify-center p-8 pb-20 lg:pb-8">
        <div
          bind:this={coverEl}
          class="group relative w-full aspect-square max-h-[50vh] lg:max-h-[67vh] max-w-[67vh] overflow-hidden rounded-lg vt-exclude-namecard"
          style="view-transition-name: project-image-{item.id}"
        >
          {#if item.hoverImage || item.image}
            {@const coverSrc = item.hoverImage || item.image}
            {@const coverFormats = item.hoverImage ? item.hoverImageFormats : item.imageFormats}
            {@const coverSrcset = getResponsiveSrcset(coverSrc)}
            {#if coverFormats?.length}
              <picture>
                {#each getImageSources(coverSrc, coverFormats, '(max-width: 767px) 100vw, calc(100vw - 320px)') as source (source.type)}
                  <source srcset={source.srcset} type={source.type} sizes={source.sizes} />
                {/each}
                <img
                  src={coverSrc}
                  alt={item.name}
                  class="w-full h-full object-cover"
                  style:object-position="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
                  style:transform="scale({item.coverPosition?.zoom ?? 1})"
                  style:transform-origin="{item.coverPosition?.x ?? 50}% {item.coverPosition?.y ?? 50}%"
                  srcset={coverSrcset}
                  sizes={coverSrcset ? '(max-width: 767px) 100vw, calc(100vw - 320px)' : undefined}
                  fetchpriority="high"
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
                srcset={coverSrcset}
                sizes={coverSrcset ? '(max-width: 767px) 100vw, calc(100vw - 320px)' : undefined}
                fetchpriority="high"
              />
            {/if}
          {:else}
            <div class="placeholder-bg w-full h-full relative bg-gradient-to-br {item.gradientColors}"></div>
          {/if}
        </div>
      </div>

      <!-- "Scroll for more" + arrows at bottom of hero -->
      <div
        class="absolute bottom-16 lg:bottom-6 right-6 flex items-center gap-3 transition-all duration-700"
        style="opacity: {showScrollHint ? 1 : 0}; transform: translateY({showScrollHint ? '0' : '12px'})"
      >
        <span
          class="pointer-events-none text-xs tracking-widest uppercase {hasScrolled ? '' : 'scroll-hint-text'}"
          style="font-family: 'DM Sans', sans-serif; {hasScrolled ? 'color: #88847F;' : ''}"
        >Scroll</span>
        <button
          type="button"
          class="p-1.5 rounded-lg text-cream/30 hover:text-cream/60 transition-colors duration-150"
          style={hasScrolled ? '' : 'animation: scroll-wave 2.5s ease-in-out infinite'}
          onclick={() => mainEl?.scrollBy({ top: 200, behavior: 'smooth' })}
          aria-label="Scroll down"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>

    {#if additionalArtifacts.length > 0}
      <div class="max-w-6xl mx-auto p-8 mb-12">
        {#if nestingWarnings.length > 0}
          <div class="mb-4 rounded-lg border border-amber-200/30 bg-amber-900/10 px-4 py-3">
            {#each nestingWarnings as warning}
              <p class="text-xs text-amber-300/80">{warning}</p>
            {/each}
          </div>
        {/if}
        {#each sectionGroups as group, groupIdx (groupIdx)}
          <div>
            {#each group.segments as { segment, segIdx } (segIdx)}
              {#if segment.type === 'break'}
                <ArtifactView schema={segment.artifact.schema} data={segment.artifact.dataBlob} />
              {:else if segment.type === 'enlarged'}
                {@const justifyClass = segment.align === 'left' ? 'justify-start' : segment.align === 'right' ? 'justify-end' : 'justify-center'}
                {@const widthPct = 50 + segment.widthPercent / 2}
                <div class="flex {justifyClass} my-4">
                  <div style="width: {widthPct}%">
                    <ArtifactView
                      schema={segment.artifact.schema}
                      data={segment.artifact.dataBlob}
                      eager={eagerIds.has(segment.artifact.id)}
                    />
                  </div>
                </div>
              {:else if segment.type === 'dense-masonry'}
                {@const cols = segmentColumns2.get(segIdx) ?? [[], [], [], []]}
                <div class="grid grid-cols-4 gap-2 items-start">
                  {#each cols as col, colIdx (colIdx)}
                    <div class="flex flex-col gap-2">
                      {#each col as artifact (artifact.id)}
                        <ArtifactView
                          schema={artifact.schema}
                          data={artifact.dataBlob}
                          eager={eagerIds.has(artifact.id)}
                          aspectRatio={artifactRatios.get(artifact.id)}
                        />
                      {/each}
                    </div>
                  {/each}
                </div>
              {:else}
                {@const cols = segmentColumns2.get(segIdx) ?? [[], []]}
                <div class="grid grid-cols-2 gap-4 items-start">
                  {#each cols as col, colIdx (colIdx)}
                    <div class="flex flex-col gap-4">
                      {#each col as artifact (artifact.id)}
                        <ArtifactView
                          schema={artifact.schema}
                          data={artifact.dataBlob}
                          eager={eagerIds.has(artifact.id)}
                          aspectRatio={artifactRatios.get(artifact.id)}
                        />
                      {/each}
                    </div>
                  {/each}
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Prev / Next project footer -->
    {#if hasPrev || hasNext}
      {@const prevItem = hasPrev ? portfolio.filteredItems[currentIndex - 1] : null}
      {@const nextItem = hasNext ? portfolio.filteredItems[currentIndex + 1] : null}
      <footer class="hidden lg:block max-w-6xl mx-auto px-8 pb-16 pt-8">
        <div class="h-px bg-cream/10 mb-10"></div>
        <div class="flex justify-between items-start">
          {#if prevItem}
            <a
              href="/{prevItem.slug}"
              class="group flex flex-col gap-1.5 text-left"
              onclick={(e) => { e.preventDefault(); goto(`/${prevItem.slug}`); }}
            >
              <span class="text-[10px] font-medium tracking-widest uppercase text-cream/40 group-hover:text-copper/70 transition-colors">Previous</span>
              <span class="text-xl text-cream/80 group-hover:text-copper transition-colors" style="font-family: 'Cormorant Garamond', Georgia, serif;">{prevItem.name}</span>
            </a>
          {:else}
            <div></div>
          {/if}
          {#if nextItem}
            <a
              href="/{nextItem.slug}"
              class="group flex flex-col gap-1.5 text-right ml-auto"
              onclick={(e) => { e.preventDefault(); goto(`/${nextItem.slug}`); }}
            >
              <span class="text-[10px] font-medium tracking-widest uppercase text-cream/40 group-hover:text-copper/70 transition-colors">Next</span>
              <span class="text-xl text-cream/80 group-hover:text-copper transition-colors" style="font-family: 'Cormorant Garamond', Georgia, serif;">{nextItem.name}</span>
            </a>
          {/if}
        </div>
      </footer>
    {/if}
</main>
{/key}
<!-- Floating mobile nav -->
<div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] lg:hidden flex items-center gap-3">
  <button
    type="button"
    class="p-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-lg transition-colors {hasPrev ? 'text-walnut' : 'text-walnut/25'}"
    disabled={!hasPrev}
    onclick={() => hasPrev && goto(`/${portfolio.filteredItems[currentIndex - 1].slug}`)}
    aria-label="Previous project"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
  </button>
  <a href="/" class="inline-flex items-center px-4 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg text-walnut text-sm" onclick={(event) => {
    event.preventDefault();
    goto('/', item ? { state: { hoverId: item.id } } : undefined);
  }}>
    Back
  </a>
  <button
    type="button"
    class="p-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-lg transition-colors {hasNext ? 'text-walnut' : 'text-walnut/25'}"
    disabled={!hasNext}
    onclick={() => hasNext && goto(`/${portfolio.filteredItems[currentIndex + 1].slug}`)}
    aria-label="Next project"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</div>
{/if}

