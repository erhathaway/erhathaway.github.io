<script lang="ts">
	import { onMount } from 'svelte';

	type Category = {
		id: number;
		name: string;
		displayName: string;
		isPublished: boolean;
	};

	type Project = {
		id: number;
		name: string;
		displayName: string;
		description: string | null;
		isPublished: boolean;
	};

	type Props = {
		categories: Category[];
		categoriesLoaded: boolean;
		getToken: () => Promise<string | null>;
	};

	let { categories, categoriesLoaded, getToken } = $props<Props>();

	let projects = $state<Project[]>([]);
	let projectsFilter = $state<'all' | 'published' | 'unpublished'>('all');
	let projectsLoading = $state(false);
	let projectsError = $state('');
	let projectsSuccess = $state('');

	let newProjectName = $state('');
	let newProjectDisplayName = $state('');
	let newProjectDescription = $state('');
	let newProjectIsPublished = $state(false);
	let newProjectCategoryIds = $state<number[]>([]);

	let editingProjectId = $state<number | null>(null);
	let editProjectName = $state('');
	let editProjectDisplayName = $state('');
	let editProjectDescription = $state('');
	let editProjectIsPublished = $state(false);
	let editProjectCategoryIds = $state<number[]>([]);

	let projectCategoryIds = $state<Record<number, number[]>>({});

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
			projects = await response.json();
			projectCategoryIds = {};
			for (const project of projects) {
				await fetchProjectCategories(project.id);
			}
		} catch (err) {
			console.error(err);
			projectsError = err instanceof Error ? err.message : 'Unable to load projects.';
		} finally {
			projectsLoading = false;
		}
	}

	async function createProject(event: Event) {
		event.preventDefault();
		projectsError = '';
		projectsSuccess = '';

		const token = await getToken();
		if (!token) {
			projectsError = 'Sign in to create projects.';
			return;
		}

		const response = await fetch('/api/projects', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				name: newProjectName.trim(),
				displayName: newProjectDisplayName.trim(),
				description: newProjectDescription.trim(),
				isPublished: newProjectIsPublished
			})
		});

		if (!response.ok) {
			projectsError = 'Unable to create project.';
			return;
		}

		const created = await response.json();
		projects = [created, ...projects];
		await updateProjectCategories(created.id, newProjectCategoryIds);
		newProjectName = '';
		newProjectDisplayName = '';
		newProjectDescription = '';
		newProjectIsPublished = false;
		newProjectCategoryIds = [];
		projectsSuccess = 'Project created.';
	}

	function startProjectEdit(project: Project) {
		editingProjectId = project.id;
		editProjectName = project.name;
		editProjectDisplayName = project.displayName;
		editProjectDescription = project.description ?? '';
		editProjectIsPublished = project.isPublished;
		editProjectCategoryIds = [...(projectCategoryIds[project.id] ?? [])];
		projectsSuccess = '';
		projectsError = '';
	}

	function cancelProjectEdit() {
		editingProjectId = null;
		editProjectName = '';
		editProjectDisplayName = '';
		editProjectDescription = '';
		editProjectIsPublished = false;
		editProjectCategoryIds = [];
	}

	async function saveProjectEdit() {
		if (editingProjectId === null) return;
		projectsError = '';
		projectsSuccess = '';

		const token = await getToken();
		if (!token) {
			projectsError = 'Sign in to update projects.';
			return;
		}

		const response = await fetch(`/api/projects/${editingProjectId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				name: editProjectName.trim(),
				displayName: editProjectDisplayName.trim(),
				description: editProjectDescription.trim(),
				isPublished: editProjectIsPublished
			})
		});

		if (!response.ok) {
			projectsError = 'Unable to update project.';
			return;
		}

		const updated = await response.json();
		projects = projects.map((project) => (project.id === updated.id ? updated : project));
		await updateProjectCategories(editingProjectId, editProjectCategoryIds);
		cancelProjectEdit();
		projectsSuccess = 'Project updated.';
	}

	async function deleteProject(projectId: number) {
		projectsError = '';
		projectsSuccess = '';

		const token = await getToken();
		if (!token) {
			projectsError = 'Sign in to delete projects.';
			return;
		}

		const response = await fetch(`/api/projects/${projectId}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok) {
			projectsError = 'Unable to delete project.';
			return;
		}

		projects = projects.filter((project) => project.id !== projectId);
		const { [projectId]: _removed, ...rest } = projectCategoryIds;
		projectCategoryIds = rest;
		projectsSuccess = 'Project deleted.';
	}

	function toggleCategory(ids: number[], categoryId: number) {
		if (ids.includes(categoryId)) {
			return ids.filter((id) => id !== categoryId);
		}
		return [...ids, categoryId];
	}

	async function fetchProjectCategories(projectId: number) {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const response = await fetch(`/api/projects/${projectId}/categories`, { headers });
		if (!response.ok) {
			throw new Error('Failed to load project categories');
		}
		const rows = (await response.json()) as Category[];
		projectCategoryIds = {
			...projectCategoryIds,
			[projectId]: rows.map((row) => row.id)
		};
	}

	async function updateProjectCategories(projectId: number, desiredIds: number[]) {
		const token = await getToken();
		if (!token) {
			projectsError = 'Sign in to update project categories.';
			return;
		}

		const current = projectCategoryIds[projectId] ?? [];
		const toAdd = desiredIds.filter((id) => !current.includes(id));
		const toRemove = current.filter((id) => !desiredIds.includes(id));

		if (toAdd.length > 0) {
			const response = await fetch(`/api/projects/${projectId}/categories`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ category_ids: toAdd })
			});
			if (!response.ok) {
				projectsError = 'Unable to add project categories.';
				return;
			}
		}

		if (toRemove.length > 0) {
			const response = await fetch(`/api/projects/${projectId}/categories`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ category_ids: toRemove })
			});
			if (!response.ok) {
				projectsError = 'Unable to remove project categories.';
				return;
			}
		}

		projectCategoryIds = { ...projectCategoryIds, [projectId]: [...desiredIds] };
	}

	function getCategory(categoryId: number) {
		return categories.find((category) => category.id === categoryId);
	}

	onMount(fetchProjects);
</script>

<section class="mt-8 bg-white/70 border border-walnut/10 rounded-2xl p-6 shadow-sm">
	<div class="flex flex-wrap items-center justify-between gap-4 mb-6">
		<div>
			<h2 class="font-display text-2xl text-walnut">Projects</h2>
			<p class="text-ash text-sm">Create, publish, and describe projects.</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={fetchProjects}
				class="px-4 py-2 rounded-full border border-walnut/20 text-sm text-walnut hover:border-copper hover:text-copper transition-colors"
			>
				Refresh
			</button>
			<select
				bind:value={projectsFilter}
				class="px-3 py-2 rounded-full border border-walnut/20 bg-white/80 text-sm"
			>
				<option value="all">All</option>
				<option value="published">Published</option>
				<option value="unpublished">Unpublished</option>
			</select>
		</div>
	</div>

	<form class="grid gap-4 md:grid-cols-[1fr_1fr] items-end" onsubmit={createProject}>
		<label class="text-sm">
			<span class="text-ash">Name</span>
			<input
				bind:value={newProjectName}
				required
				class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
				placeholder="side-table"
			/>
		</label>
		<label class="text-sm">
			<span class="text-ash">Display name</span>
			<input
				bind:value={newProjectDisplayName}
				class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
				placeholder="Side Table"
			/>
		</label>
		<label class="text-sm md:col-span-2">
			<span class="text-ash">Description</span>
			<textarea
				bind:value={newProjectDescription}
				rows="3"
				class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
				placeholder="Brief description of the project..."
			></textarea>
		</label>
		<div class="md:col-span-2">
			<p class="text-sm text-ash">Categories</p>
			{#if !categoriesLoaded}
				<p class="mt-2 text-xs text-ash">Loading categories...</p>
			{:else if categories.length === 0}
				<p class="mt-2 text-xs text-ash">Create a category to start tagging projects.</p>
				{:else}
					<div class="mt-2 flex flex-wrap gap-2">
						{#each categories as category (category.id)}
							{@const isSelected = newProjectCategoryIds.includes(category.id)}
							<button
								type="button"
								onclick={() =>
									(newProjectCategoryIds = toggleCategory(newProjectCategoryIds, category.id))}
								class={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
									isSelected
										? 'bg-copper/90 text-cream border-copper ring-2 ring-copper/40'
										: 'border-walnut/20 text-walnut hover:border-copper hover:text-copper'
								}`}
							>
								<span class={isSelected ? 'font-semibold' : ''}>{category.displayName}</span>
								<span
									class={`text-[10px] uppercase tracking-wide ${
										isSelected
											? 'text-cream/80'
											: category.isPublished
												? 'text-emerald-200'
												: 'text-ash'
									}`}
								>
									{isSelected ? 'Selected' : category.isPublished ? 'Live' : 'Draft'}
								</span>
							</button>
						{/each}
					</div>
				{/if}
		</div>
		<label class="flex items-center gap-2 text-sm text-ash">
			<input type="checkbox" bind:checked={newProjectIsPublished} class="accent-copper" />
			Published
		</label>
		<button
			type="submit"
			class="px-4 py-2 rounded-full bg-walnut text-cream text-sm hover:bg-copper transition-colors"
		>
			Add
		</button>
	</form>

	{#if projectsError}
		<div class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{projectsError}
		</div>
	{/if}
	{#if projectsSuccess}
		<p class="mt-4 text-sm text-emerald-700">{projectsSuccess}</p>
	{/if}

	<div class="mt-6 space-y-3">
		{#if projectsLoading}
			<p class="text-ash text-sm">Loading projects...</p>
		{:else if filteredProjects.length === 0}
			<p class="text-ash text-sm">No projects yet.</p>
		{:else}
			{#each filteredProjects as project (project.id)}
				<div
					class="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-walnut/10 bg-white px-4 py-3"
				>
					{#if editingProjectId === project.id}
						<div class="flex flex-col gap-3 flex-1 min-w-[240px]">
							<div class="flex flex-wrap gap-3">
								<input
									bind:value={editProjectName}
									class="w-40 rounded-md border border-walnut/20 px-3 py-2 text-sm"
								/>
								<input
									bind:value={editProjectDisplayName}
									class="w-56 rounded-md border border-walnut/20 px-3 py-2 text-sm"
									placeholder={editProjectName}
								/>
							</div>
							<textarea
								bind:value={editProjectDescription}
								rows="3"
								class="w-full rounded-md border border-walnut/20 px-3 py-2 text-sm"
							></textarea>
							<div>
								<p class="text-sm text-ash">Categories</p>
									<div class="mt-2 flex flex-wrap gap-2">
										{#each categories as category (category.id)}
											{@const isSelected = editProjectCategoryIds.includes(category.id)}
											<button
												type="button"
												onclick={() =>
													(editProjectCategoryIds = toggleCategory(
														editProjectCategoryIds,
														category.id
													))}
												class={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
													isSelected
														? 'bg-copper/90 text-cream border-copper ring-2 ring-copper/40'
														: 'border-walnut/20 text-walnut hover:border-copper hover:text-copper'
												}`}
											>
												<span class={isSelected ? 'font-semibold' : ''}>{category.displayName}</span>
												<span
													class={`text-[10px] uppercase tracking-wide ${
														isSelected
															? 'text-cream/80'
															: category.isPublished
																? 'text-emerald-200'
																: 'text-ash'
													}`}
												>
													{isSelected ? 'Selected' : category.isPublished ? 'Live' : 'Draft'}
												</span>
											</button>
										{/each}
									</div>
								</div>
							<label class="flex items-center gap-2 text-sm text-ash">
								<input type="checkbox" bind:checked={editProjectIsPublished} class="accent-copper" />
								Published
							</label>
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={saveProjectEdit}
								class="px-3 py-2 rounded-full bg-walnut text-cream text-sm hover:bg-copper transition-colors"
							>
								Save
							</button>
							<button
								type="button"
								onclick={cancelProjectEdit}
								class="px-3 py-2 rounded-full border border-walnut/20 text-sm text-walnut hover:border-copper hover:text-copper transition-colors"
							>
								Cancel
							</button>
						</div>
					{:else}
						<div class="flex flex-col gap-1 flex-1 min-w-[240px]">
							<div class="flex items-center gap-3">
								<p class="font-medium text-walnut">{project.displayName}</p>
								<span
									class="px-2 py-1 rounded-full text-xs border border-walnut/10 bg-cream/60 text-ash"
								>
									{project.isPublished ? 'Published' : 'Draft'}
								</span>
							</div>
							<p class="text-xs text-ash">/{project.name}</p>
							<p class="text-sm text-ash">{project.description ?? ''}</p>
							{#if (projectCategoryIds[project.id] ?? []).length > 0}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each projectCategoryIds[project.id] ?? [] as categoryId (categoryId)}
										{#if getCategory(categoryId)}
											<span
												class={`flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] ${
													getCategory(categoryId)?.isPublished
														? 'border-emerald-200/60 text-emerald-700 bg-emerald-50/60'
														: 'border-walnut/10 text-ash bg-cream/60'
												}`}
											>
												{getCategory(categoryId)?.displayName}
												<span class="uppercase tracking-wide text-[9px]">
													{getCategory(categoryId)?.isPublished ? 'Live' : 'Draft'}
												</span>
											</span>
										{/if}
									{/each}
								</div>
							{:else}
								<p class="mt-2 text-xs text-ash">No categories assigned.</p>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => startProjectEdit(project)}
								class="px-3 py-2 rounded-full border border-walnut/20 text-sm text-walnut hover:border-copper hover:text-copper transition-colors"
							>
								Edit
							</button>
							<button
								type="button"
								onclick={() => deleteProject(project.id)}
								class="px-3 py-2 rounded-full border border-red-200 text-sm text-red-700 hover:border-red-300 hover:text-red-800 transition-colors"
							>
								Delete
							</button>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</section>
