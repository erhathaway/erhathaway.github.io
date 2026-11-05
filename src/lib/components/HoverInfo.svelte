<script lang="ts">
  import type { PortfolioItem } from '$lib/data/items';
  import { page } from '$app/state';
  import { DEFAULT_THEME, panelClipPath, panelTextWidth, type HoverCardTheme } from '$lib/hover-card';
  import { getHoverCardPreview } from '$lib/hover-card/preview';

  let {
    item,
    variant = 'inline',
    dockSide = 'left',
    theme = undefined
  }: {
    item: PortfolioItem;
    variant?: 'inline' | 'tile';
    dockSide?: 'left' | 'right';
    theme?: HoverCardTheme;
  } = $props();
  const hoverCardPreview = getHoverCardPreview();
  const hoverCard = $derived(
    theme ??
      (hoverCardPreview.enabled ? hoverCardPreview.draft : null) ??
      (page.data.hoverCardTheme as HoverCardTheme | undefined) ??
      DEFAULT_THEME
  );

  function formatMetadata(key: string, value: string): string {
    return value;
  }

  const isTile = $derived(variant === 'tile');
  const tileClipPath = $derived(panelClipPath(hoverCard, dockSide));

  const wrapperClass = $derived.by(() => {
    if (variant === 'tile') {
      return 'relative w-full h-full text-walnut flex items-center overflow-hidden';
    }
    return 'hover-inline-card text-walnut py-12 flex items-center';
  });

  const innerClass = $derived.by(() => {
    if (variant === 'tile') {
      return dockSide === 'right' ? 'w-full flex justify-end' : 'w-full flex';
    }
    return 'hover-inline-inner w-full';
  });
  const innerStyle = $derived.by(() => {
    if (variant === 'tile') {
      return dockSide === 'right'
        ? 'padding: clamp(1rem, 2vw, 2rem) clamp(1rem, 2vw, 2rem) clamp(1rem, 2vw, 2rem) clamp(1rem, 1.8vw, 1.75rem);'
        : 'padding: clamp(1rem, 2vw, 2rem) clamp(1rem, 1.8vw, 1.75rem);';
    }
    return undefined;
  });

  const projectHeaderClass = $derived.by(() => {
    if (!isTile) return 'project-header-block text-left';
    return dockSide === 'right' ? 'text-right' : 'text-left';
  });
  const projectHeaderStyle = $derived.by(() => {
    if (!isTile) return undefined;
    const width = panelTextWidth(hoverCard);
    return `width: ${width}; max-width: ${width};`;
  });

  const titleClass = $derived.by(() =>
    isTile
      ? 'leading-tight vt-exclude-namecard'
      : 'font-display text-3xl font-semibold text-walnut leading-tight mb-4 vt-exclude-namecard'
  );
  const titleStyle = $derived.by(() =>
    isTile
      ? 'font-size: clamp(1.1rem, 2.4vw, 2.25rem); margin-bottom: clamp(0.5rem, 1.2vw, 1.25rem);'
      : undefined
  );
  const descriptionClass = $derived.by(() =>
    isTile
      ? 'leading-relaxed vt-exclude-namecard'
      : 'text-base text-ash leading-relaxed mb-6 vt-exclude-namecard'
  );
  const descriptionStyle = $derived.by(() =>
    isTile
      ? 'font-size: clamp(0.65rem, 0.95vw, 1rem); margin-bottom: clamp(0.75rem, 1.5vw, 2rem);'
      : undefined
  );
  const metaKeyClass = $derived.by(() =>
    isTile ? 'tracking-[0.2em] uppercase' : 'text-[10px] tracking-wider uppercase text-ash'
  );
  const metaKeyStyle = $derived.by(() =>
    isTile ? 'font-size: clamp(0.5rem, 0.7vw, 0.6875rem);' : undefined
  );
  const metaValueClass = $derived.by(() => (isTile ? '' : 'font-display text-base text-walnut'));
  const metaValueStyle = $derived.by(() =>
    isTile ? 'font-size: clamp(0.7rem, 1vw, 1rem);' : undefined
  );

  const tileCategoryClass = $derived.by(() =>
    isTile
      ? 'font-medium tracking-widest uppercase text-walnut vt-exclude-namecard'
      : 'text-[10px] font-medium tracking-widest uppercase text-copper mb-3 vt-exclude-namecard'
  );
  const tileCategoryStyle = $derived.by(() =>
    isTile
      ? 'font-size: clamp(0.5rem, 0.7vw, 0.625rem); margin-bottom: clamp(0.375rem, 0.8vw, 0.75rem);'
      : undefined
  );

  const tileTextWrapClass = $derived.by(() => {
    if (!isTile) return '';
    const maxWidth = hoverCard.shape === 'full' ? 'max-w-full' : 'max-w-[72%]';
    return dockSide === 'right' ? `relative z-10 ${maxWidth} ml-auto` : `relative z-10 ${maxWidth}`;
  });
</script>

{#if item}
  <div class={wrapperClass} style:container-type={isTile ? 'size' : undefined}>
    {#if isTile}
      <div class="soft-glass absolute inset-0" style:clip-path={tileClipPath}></div>
    {/if}
    <div class={innerClass} style={innerStyle}>
      <div class={projectHeaderClass} style={projectHeaderStyle}>
      <div class={tileTextWrapClass}>
        <h3 data-typo={isTile ? 'tile-title' : 'hover-title'} class={titleClass} style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 400; letter-spacing: 0.02em; color: #3d2e1e; {titleStyle ?? ''}">
          {item.name}
        </h3>

        {#if item.description?.trim()}
          <p data-typo={isTile ? 'tile-description' : 'hover-description'} class={descriptionClass} style="font-family: 'DM Sans', sans-serif; color: {isTile ? '#4a3d32' : '#6b5c4f'}; {isTile ? 'letter-spacing: 0.01em;' : ''} {descriptionStyle ?? ''}">
            {item.description}
          </p>
        {/if}

        {#if item.metadata}
          <div class="flex vt-exclude-namecard {dockSide === 'right' ? 'justify-end text-right' : 'justify-start text-left'}" style="gap: {isTile ? 'clamp(0.75rem, 1.2vw, 1.5rem)' : '1.5rem'};">
            {#each Object.entries(item.metadata) as [key, value] (key)}
              <div class="flex flex-col {dockSide === 'right' ? 'items-end' : 'items-start'}" style="gap: {isTile ? 'clamp(0.2rem, 0.4vw, 0.375rem)' : '0.375rem'};">
                <span data-typo={isTile ? 'tile-label' : 'hover-label'} class={metaKeyClass} style="color: {isTile ? '#5f5044' : '#a08e7a'}; {metaKeyStyle ?? ''}">{key}</span>
                <span data-typo={isTile ? 'tile-value' : 'hover-value'} class={metaValueClass} style="font-family: 'Cormorant Garamond', Georgia, serif; color: #3d2e1e; {metaValueStyle ?? ''}">{formatMetadata(key, value)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      </div>
    </div>
  </div>
{/if}
