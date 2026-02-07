<script lang="ts">
  import { onMount } from 'svelte';
  import GalleryGrid from '$lib/components/GalleryGrid.svelte';
  import { portfolio } from '$lib/stores/portfolio.svelte';

  onMount(() => {
    portfolio.loadProjects();
  });
</script>

<GalleryGrid />
