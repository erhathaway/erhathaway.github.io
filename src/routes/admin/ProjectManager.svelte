<script lang="ts">
	import { onMount } from 'svelte';
	import { adminStore } from '$lib/stores/admin.svelte';

	type Props = {
		getToken: () => Promise<string | null>;
	};

	let { getToken }: Props = $props();

	const projects = $derived(adminStore.projects);
	let projectsFilter = $state<'all' | 'published' | 'unpublished'>('all');
	let projectsLoading = $state(false);
	let projectsError = $state('');
	let projectsSuccess = $state('');

	const filteredProjects = $derived.by(() => {
		if (projectsFilter === 'published') {
			return projects.filter((project) => project.isPublished);
		}
		if (projectsFilter === 'unpublished') {
			return projects.filter((project) => !project.isPublished);
		}
		return projects;
	});

	async function fetchProjects() {
		projectsError = '';
		projectsLoading = true;
		try {
			const token = await getToken();
			const headers: Record<string, string> = {};
			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}

			const response = await fetch('/api/projects', { headers });
			if (!response.ok) {
				if (response.status === 500) {
					throw new Error(
						'Cloudflare bindings are unavailable. Run `bun run dev` (do not pass --open), then open http://localhost:5173 manually.'
					);
				}
				throw new Error('Failed to load projects');
			}
			adminStore.projects = await response.json();
			adminStore.projectsLoaded = true;
		} catch (err) {
			console.error(err);
			projectsError = err instanceof Error ? err.message : 'Unable to load projects.';
		} finally {
			projectsLoading = false;
		}
	}

	onMount(fetchProjects);
</script>

<section class="mt-8 mb-8">
	<div class="flex flex-wrap items-center justify-between gap-4 mb-5">
		<div>
			<h2 class="text-lg font-semibold text-slate-900">Projects</h2>
			<p class="text-sm text-slate-500 mt-0.5">Manage portfolio projects</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={fetchProjects}
				disabled={projectsLoading}
				class="px-3.5 py-1.5 text-xs font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
			>
				{projectsLoading ? 'Refreshing...' : 'Refresh'}
			</button>
			<select
				bind:value={projectsFilter}
				class="px-3 py-1.5 pr-8 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-600 cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150 appearance-none"
				style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%23999%27%3e%3cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 8px center; background-size: 14px;"
			>
				<option value="all">All</option>
				<option value="published">Published</option>
				<option value="unpublished">Drafts</option>
			</select>
		</div>
	</div>

	<p class="text-xs text-slate-400 mb-5 pb-5 border-b border-slate-100">
		Add projects from the left panel.
	</p>

	{#if projectsError}
		<div class="flex items-start gap-2 mb-3">
			<svg class="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<p class="text-xs text-red-600">{projectsError}</p>
		</div>
	{/if}
	{#if projectsSuccess}
		<div class="flex items-start gap-2 mb-3">
			<svg class="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<p class="text-xs text-emerald-600">{projectsSuccess}</p>
		</div>
	{/if}

	{#if projectsLoading}
		<div class="flex items-center gap-2 py-4">
			<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500"></div>
			<p class="text-xs text-slate-400">Loading...</p>
		</div>
	{:else if filteredProjects.length === 0}
		<p class="text-xs text-slate-400 py-4">No projects yet</p>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
			{#each filteredProjects as project (project.id)}
				<a
					href={`/admin/projects/${project.id}`}
					class="group relative rounded-2xl overflow-hidden border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200"
				>
					<!-- Cover Image or Placeholder -->
					<div class="aspect-[3/4] w-full bg-slate-100 overflow-hidden">
						{#if project.coverImageUrl}
							<img
								src={project.coverImageUrl}
								alt={project.displayName}
								class="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
								loading="lazy"
							/>
						{:else}
							<div class="h-full w-full flex flex-col items-center justify-center gap-2 text-slate-300">
								<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
								</svg>
								<span class="text-[10px] font-medium">No cover</span>
							</div>
						{/if}
					</div>

					<!-- Top Overlay: Title + Categories -->
					<div class="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-black/40 to-transparent p-3 pb-10">
						<div class="flex items-center gap-1.5">
							<span class={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${project.isPublished ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
							<h3 class="text-base font-semibold text-white truncate">{project.displayName || project.name}</h3>
						</div>
						{#if project.categories.length > 0}
							<div class="flex flex-wrap gap-1 mt-1.5">
								{#each project.categories as cat}
									<span class="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">{cat}</span>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Bottom Overlay: Attributes -->
					{#if project.navAttributes.length > 0}
						<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3 pt-10">
							<div class="flex flex-wrap gap-1">
								{#each project.navAttributes as attr}
									<span class="inline-block rounded-full bg-amber-400/25 px-2 py-0.5 text-[11px] font-medium text-amber-200 backdrop-blur-sm">{attr.name}: {attr.value}</span>
								{/each}
							</div>
						</div>
					{/if}

				</a>
			{/each}
		</div>
	{/if}
</section>
