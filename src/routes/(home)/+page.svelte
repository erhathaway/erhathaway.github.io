<script lang="ts">
  import GalleryGrid from '$lib/components/GalleryGrid.svelte';
  import { portfolio } from '$lib/stores/portfolio.svelte';

  let { data } = $props();

  $effect(() => {
    portfolio.projects = data.projects;
    portfolio.categories = data.categories;
    portfolio.namecardImage = data.namecardImage;
    portfolio.projectNamecardImage = data.projectNamecardImage;
  });
</script>

<svelte:head>
  <meta name="description" content="Woodworking, pottery, and other things I make." />
  <meta property="og:title" content="Ethan Hathaway" />
  <meta property="og:description" content="Woodworking, pottery, and other things I make." />
  <meta property="og:type" content="website" />
  {#if data.namecardImage}
    <meta property="og:image" content={data.namecardImage.imageUrl} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content={data.namecardImage.imageUrl} />
  {/if}
  <meta name="twitter:title" content="Ethan Hathaway" />
  <meta name="twitter:description" content="Woodworking, pottery, and other things I make." />
</svelte:head>

<GalleryGrid />
