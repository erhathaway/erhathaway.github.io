<script lang="ts">
  import { untrack } from 'svelte';
  import GalleryGrid from '$lib/components/GalleryGrid.svelte';
  import { portfolio } from '$lib/stores/portfolio.svelte';
  import { replaceExtension } from '$lib/utils/image-formats';

  let { data } = $props();

  // Set initial data synchronously so SSR renders the full grid (prevents CLS)
  untrack(() => {
  portfolio.projects = data.projects;
  portfolio.categories = data.categories;
  portfolio.namecardImage = data.namecardImage;
  portfolio.projectNamecardImage = data.projectNamecardImage;
  });

  // Re-sync on client-side navigations when data changes
  $effect(() => {
    portfolio.projects = data.projects;
    portfolio.categories = data.categories;
    portfolio.namecardImage = data.namecardImage;
    portfolio.projectNamecardImage = data.projectNamecardImage;
  });

  // Use WebP for OG image (social crawlers don't support AVIF)
  const ogImageUrl = $derived.by(() => {
    if (!data.previewNamecardImage?.imageUrl) return null;
    const url = data.previewNamecardImage.imageUrl;
    const hasWebp = data.previewNamecardImage.imageFormats?.includes('webp');
    const absUrl = hasWebp ? replaceExtension(url, 'webp') : url;
    return `${data.origin}${absUrl}`;
  });
</script>

<svelte:head>
  <title>Ethan Hathaway — Things I Make</title>
  <meta name="description" content="Woodworking, pottery, and other things I make." />
  <meta property="og:title" content="Ethan Hathaway" />
  <meta property="og:description" content="Woodworking, pottery, and other things I make." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={data.origin} />
  {#if ogImageUrl}
    <meta property="og:image" content={ogImageUrl} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content={ogImageUrl} />
  {/if}
  <meta name="twitter:title" content="Ethan Hathaway" />
  <meta name="twitter:description" content="Woodworking, pottery, and other things I make." />
</svelte:head>

<GalleryGrid />
