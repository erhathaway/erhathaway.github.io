<script lang="ts">
	import { onMount } from 'svelte';
	import ProjectEditor, { type AttributeDraft, type ProjectEditorPayload } from './ProjectEditor.svelte';
	import { adminStore } from '$lib/stores/admin.svelte';

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

	type ProjectAttribute = {
		id: number;
		name: string;
		value: string;
		showInNav: boolean;
		isPublished: boolean;
	};

	type Props = {
		categories: Category[];
		categoriesLoaded: boolean;
		getToken: () => Promise<string | null>;
	};

	let { categories, categoriesLoaded, getToken } = $props<Props>();

	const projects = $derived(adminStore.projects);
	let projectsFilter = $state<'all' | 'published' | 'unpublished'>('all');
	let projectsLoading = $state(false);
	let projectsError = $state('');
	let projectsSuccess = $state('');

	let editingProjectId = $state<number | null>(null);

	let projectCategoryIds = $state<Record<number, number[]>>({});
	let projectAttributes = $state<Record<number, ProjectAttribute[]>>({});

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
			projectCategoryIds = {};
			projectAttributes = {};
			for (const project of adminStore.projects) {
				await fetchProjectCategories(project.id);
				await fetchProjectAttributes(project.id);
			}
		} catch (err) {
			console.error(err);
			projectsError = err instanceof Error ? err.message : 'Unable to load projects.';
		} finally {
			projectsLoading = false;
		}
	}


	function startProjectEdit(project: Project) {
		editingProjectId = project.id;
		projectsSuccess = '';
		projectsError = '';
	}

	function cancelProjectEdit() {
		editingProjectId = null;
	}

	async function saveProjectEdit(payload: ProjectEditorPayload) {
		if (editingProjectId === null) {
			return;
		}
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
				name: payload.name.trim(),
				displayName: payload.displayName.trim() || payload.name.trim(),
				description: payload.description.trim(),
				isPublished: payload.isPublished
			})
		});

		if (!response.ok) {
			projectsError = 'Unable to update project.';
			return;
		}

		const updated = await response.json();
		adminStore.projects = adminStore.projects.map((project) =>
			project.id === updated.id ? updated : project
		);
		await updateProjectCategories(editingProjectId, payload.categoryIds);
		await updateProjectAttributes(editingProjectId, payload.attributes);
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

		adminStore.projects = adminStore.projects.filter((project) => project.id !== projectId);
		const { [projectId]: _removed, ...rest } = projectCategoryIds;
		projectCategoryIds = rest;
		const { [projectId]: _removedAttributes, ...restAttributes } = projectAttributes;
		projectAttributes = restAttributes;
		projectsSuccess = 'Project deleted.';
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

	async function fetchProjectAttributes(projectId: number) {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const response = await fetch(`/api/projects/${projectId}/attributes`, { headers });
		if (!response.ok) {
			throw new Error('Failed to load project attributes');
		}
		const rows = (await response.json()) as ProjectAttribute[];
		projectAttributes = {
			...projectAttributes,
			[projectId]: rows
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

	function sanitizeAttributes(attributes: AttributeDraft[]) {
		const cleaned: AttributeDraft[] = [];
		for (const attribute of attributes) {
			const name = attribute.name.trim();
			const value = attribute.value.trim();
			if (!name && !value) {
				continue;
			}
			if (!name || !value) {
				projectsError = 'Attributes need both a name and a value.';
				return null;
			}
			cleaned.push({
				id: attribute.id,
				name,
				value,
				showInNav: attribute.showInNav,
				isPublished: attribute.isPublished
			});
		}
		return cleaned;
	}

	async function updateProjectAttributes(projectId: number, attributes: AttributeDraft[]) {
		const token = await getToken();
		if (!token) {
			projectsError = 'Sign in to update project attributes.';
			return;
		}

		const cleaned = sanitizeAttributes(attributes);
		if (!cleaned) {
			return;
		}

		const response = await fetch(`/api/projects/${projectId}/attributes`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ attributes: cleaned })
		});
		if (!response.ok) {
			projectsError = 'Unable to update project attributes.';
			return;
		}
		const updated = (await response.json()) as ProjectAttribute[];
		projectAttributes = { ...projectAttributes, [projectId]: updated };
	}

	function getCategory(categoryId: number) {
		return categories.find((category) => category.id === categoryId);
	}

	onMount(fetchProjects);
</script>

<section class="mt-8 mb-8">
	<div class="flex flex-wrap items-baseline justify-between gap-4 mb-6">
		<div>
			<h2 class="font-display text-xl text-walnut">Projects</h2>
			<p class="text-ash text-xs mt-0.5">Manage portfolio projects</p>
		</div>
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={fetchProjects}
				disabled={projectsLoading}
				class="px-3 py-1.5 text-xs border border-walnut/20 rounded-full hover:bg-walnut/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{projectsLoading ? 'Refreshing...' : 'Refresh'}
			</button>
			<select
				bind:value={projectsFilter}
				class="px-3 py-1.5 pr-8 text-xs border border-walnut/20 rounded-full bg-white appearance-none cursor-pointer hover:bg-walnut/5 focus:outline-none focus:border-walnut/40 relative"
				style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%23888%27%3e%3cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px;"
			>
				<option value="all">All</option>
				<option value="published">Published</option>
				<option value="unpublished">Drafts</option>
			</select>
		</div>
	</div>

	<p class="text-xs text-ash mb-6 pb-6 border-b border-walnut/5">
		Add projects from the left panel.
	</p>

	{#if projectsError}
		<p class="text-xs text-red-600 mb-3">{projectsError}</p>
	{/if}
	{#if projectsSuccess}
		<p class="text-xs text-emerald-600 mb-3">{projectsSuccess}</p>
	{/if}

	{#if projectsLoading}
		<p class="text-xs text-ash">Loading...</p>
	{:else if filteredProjects.length === 0}
		<p class="text-xs text-ash">No projects yet</p>
	{:else if editingProjectId !== null}
		{#each filteredProjects as project (project.id)}
			{#if editingProjectId === project.id}
				<div class="flex flex-wrap items-center gap-3 p-4 bg-white/70 rounded-xl border border-walnut/15">
					{#key project.id}
						<ProjectEditor
							project={project}
							{categories}
							{categoriesLoaded}
							categoryIds={projectCategoryIds[project.id] ?? []}
							attributes={projectAttributes[project.id] ?? []}
							onSave={saveProjectEdit}
							onCancel={cancelProjectEdit}
						/>
					{/key}
				</div>
			{/if}
		{/each}
	{:else}
		<div class="space-y-3">
			{#each filteredProjects as project (project.id)}
				<div class="group p-4 bg-[#E8E4DE] border border-walnut/15 rounded-xl hover:border-walnut/25 hover:bg-[#DDD9D3] transition-all">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1 space-y-2">
							<div class="flex items-center gap-2">
								<span class="text-sm text-walnut font-medium">{project.displayName || project.name}</span>
								<span class="text-xs text-ash">/{project.name}</span>
								{#if project.isPublished}
									<span class="w-1.5 h-1.5 bg-copper rounded-full flex-shrink-0"></span>
								{:else}
									<span class="text-xs text-ash/60">(draft)</span>
								{/if}
							</div>

							{#if project.description}
								<p class="text-xs text-walnut/70">{project.description}</p>
							{/if}

							{#if (projectCategoryIds[project.id] ?? []).length > 0}
								<div class="flex flex-wrap gap-1.5">
									{#each projectCategoryIds[project.id] ?? [] as categoryId (categoryId)}
										{#if getCategory(categoryId)}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/60 border border-walnut/10 text-[10px]">
												<span class="text-walnut">{getCategory(categoryId)?.displayName}</span>
												{#if getCategory(categoryId)?.isPublished}
													<span class="w-1 h-1 bg-copper rounded-full"></span>
												{/if}
											</span>
										{/if}
									{/each}
								</div>
							{/if}

							{#if (projectAttributes[project.id] ?? []).length > 0}
								<div class="flex flex-wrap gap-x-3 gap-y-1">
									{#each projectAttributes[project.id] ?? [] as attribute (attribute.id)}
										<span class="text-[10px] text-ash">
											<span class="text-walnut/80">{attribute.name}:</span> {attribute.value}
											{#if attribute.showInNav}
												<span class="text-copper">•</span>
											{/if}
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
							<a
								href={`/admin/projects/${project.id}`}
								class="text-xs text-ash hover:text-walnut hover:bg-blue-100 rounded px-2 py-0.5 transition-colors"
							>
								Edit
							</a>
							<span class="text-ash/20">|</span>
							<button
								type="button"
								onclick={() => startProjectEdit(project)}
								class="text-xs text-ash hover:text-walnut hover:bg-copper/10 rounded px-2 py-0.5 transition-colors"
							>
								Quick Edit
							</button>
							<span class="text-ash/20">|</span>
							<button
								type="button"
								onclick={() => deleteProject(project.id)}
								class="text-xs text-red-600/70 hover:text-red-600 hover:bg-red-50 rounded px-2 py-0.5 transition-colors"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
