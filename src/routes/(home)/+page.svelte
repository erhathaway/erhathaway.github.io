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
</svelte:head>

<GalleryGrid />
