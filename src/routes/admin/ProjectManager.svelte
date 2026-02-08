<script lang="ts">
	import { onMount } from 'svelte';
	import { adminStore, type AdminProject } from '$lib/stores/admin.svelte';
	import GalleryItem from '$lib/components/GalleryItem.svelte';
	import type { PortfolioItem } from '$lib/data/items';

	type Props = {
		getToken: () => Promise<string | null>;
	};

	let { getToken }: Props = $props();

	const projects = $derived(adminStore.projects);
	let projectsFilter: string = $state('all');
	let projectsLoading = $state(false);
	let projectsError = $state('');
	let projectsSuccess = $state('');

	let rearranging = $state(false);
	let draggedId = $state<number | null>(null);
	let dropTargetId = $state<number | null>(null);
	let reorderSaving = $state(false);

	$effect(() => {
		(window as unknown as Record<string, unknown>).__adminRearranging = rearranging;
		return () => { (window as unknown as Record<string, unknown>).__adminRearranging = false; };
	});

	function handleDragStart(event: DragEvent, project: AdminProject) {
		draggedId = project.id;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', String(project.id));
		}
	}

	function handleDragOver(event: DragEvent, project: AdminProject) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dropTargetId = project.id;
	}

	function handleDragLeave() {
		dropTargetId = null;
	}

	async function handleDrop(event: DragEvent, targetProject: AdminProject) {
		event.preventDefault();
		dropTargetId = null;

		if (draggedId === null || draggedId === targetProject.id) {
			draggedId = null;
			return;
		}

		const fromIndex = adminStore.projects.findIndex((p) => p.id === draggedId);
		const toIndex = adminStore.projects.findIndex((p) => p.id === targetProject.id);
		if (fromIndex === -1 || toIndex === -1) {
			draggedId = null;
			return;
		}

		const reordered = [...adminStore.projects];
		const [moved] = reordered.splice(fromIndex, 1);
		reordered.splice(toIndex, 0, moved);
		adminStore.projects = reordered;
		draggedId = null;

		reorderSaving = true;
		try {
			const token = await getToken();
			if (!token) return;
			await fetch('/api/admin/projects/reorder', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ ids: adminStore.projects.map((p) => p.id) })
			});
		} finally {
			reorderSaving = false;
		}
	}

	function handleDragEnd() {
		draggedId = null;
		dropTargetId = null;
	}

	const filteredProjects = $derived.by(() => {
		if (projectsFilter === 'published') {
			return projects.filter((project) => project.isPublished);
		}
		if (projectsFilter === 'unpublished') {
			return projects.filter((project) => !project.isPublished);
		}
		return projects;
	});

	function toPortfolioItem(project: AdminProject): PortfolioItem {
		const metadata: Record<string, string> = {};
		for (const attr of project.navAttributes) {
			metadata[attr.name] = attr.value;
		}
		return {
			id: project.id,
			name: project.displayName || project.name,
			categories: project.categories,
			description: project.description ?? '',
			metadata,
			image: project.coverImageUrl ?? undefined,
			hoverImage: project.coverHoverImageUrl ?? undefined,
			gridSize: 'regular',
			gradientColors: 'from-[#C7D2D8] via-[#B8C5CE] to-[#D0DAE0]',
			coverPosition: {
				x: project.coverPositionX ?? 50,
				y: project.coverPositionY ?? 50,
				zoom: project.coverZoom ?? 1
			}
		};
	}

	async function fetchProjects() {
		projectsError = '';
		projectsLoading = true;
		try {
			const token = await getToken();
			const headers: Record<string, string> = {};
			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}

			const response = await fetch('/api/admin/projects', { headers });
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
				onclick={() => { rearranging = !rearranging; }}
				class={`px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-all duration-150 ${
					rearranging
						? 'border-blue-300 bg-blue-50 text-blue-700'
						: 'border-slate-200 text-slate-600 hover:bg-slate-50'
				}`}
			>
				{#if reorderSaving}
					Saving...
				{:else if rearranging}
					Done
				{:else}
					Rearrange
				{/if}
			</button>
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
				{@const portfolioItem = toPortfolioItem(project)}
				<div
					class="group rounded-2xl overflow-hidden border bg-white transition-all duration-200 {rearranging
						? (draggedId === project.id ? 'opacity-50 border-slate-300' : dropTargetId === project.id ? 'border-blue-400 border-2 shadow-lg' : 'border-slate-200 cursor-grab hover:border-slate-300')
						: 'border-slate-200 hover:border-slate-300 hover:shadow-md'}"
					draggable={rearranging}
					ondragstart={(e) => rearranging && handleDragStart(e, project)}
					ondragover={(e) => rearranging && handleDragOver(e, project)}
					ondragleave={() => rearranging && handleDragLeave()}
					ondrop={(e) => rearranging && handleDrop(e, project)}
					ondragend={() => rearranging && handleDragEnd()}
				>
					<!-- Header: status + name + categories -->
					<div class="p-3 pb-2">
						<div class="flex items-center gap-1.5">
							{#if rearranging}
								<svg class="w-4 h-4 text-slate-300 shrink-0" viewBox="0 0 24 24" fill="currentColor">
									<circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
									<circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
									<circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
								</svg>
							{/if}
							<span class="inline-block h-1.5 w-1.5 rounded-full shrink-0 {project.isPublished ? 'bg-emerald-400' : 'bg-slate-400'}"></span>
							<h3 class="text-sm font-semibold text-slate-900 truncate">{project.displayName || project.name}</h3>
						</div>
						<p class="text-[11px] text-slate-400 mt-0.5 truncate">/{project.name}</p>
						{#if project.categories.length > 0}
							<div class="flex flex-wrap gap-1 mt-1.5">
								{#each project.categories as cat (cat)}
									<span class="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{cat}</span>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Gallery tile -->
					<GalleryItem item={portfolioItem} static href={rearranging ? undefined : `/admin/projects/${project.id}`} />

					<!-- Footer: attributes + description -->
					<div class="p-3 pt-2">
						{#if project.navAttributes.length > 0}
							<div class="flex flex-wrap gap-1 mb-1.5">
								{#each project.navAttributes as attr (attr.name)}
									<span class="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{attr.name}: {attr.value}</span>
								{/each}
							</div>
						{/if}
						{#if project.description}
							<p class="text-[11px] text-slate-400 line-clamp-2">{project.description}</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
