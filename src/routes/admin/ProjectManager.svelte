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
	{:else if editingProjectId !== null}
		{#each filteredProjects as project (project.id)}
			{#if editingProjectId === project.id}
				<div class="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
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
		<div class="space-y-2">
			{#each filteredProjects as project (project.id)}
				<div class="group p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 hover:shadow-sm transition-all duration-150">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1 space-y-2">
							<div class="flex items-center gap-2.5">
								<span class="text-sm font-medium text-slate-800">{project.displayName || project.name}</span>
								<span class="text-xs font-mono text-slate-400">/{project.name}</span>
								<span class={`inline-block h-1.5 w-1.5 rounded-full ${project.isPublished ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
							</div>

							{#if project.description}
								<p class="text-xs text-slate-500">{project.description}</p>
							{/if}

							{#if (projectCategoryIds[project.id] ?? []).length > 0}
								<div class="flex flex-wrap gap-1.5">
									{#each projectCategoryIds[project.id] ?? [] as categoryId (categoryId)}
										{#if getCategory(categoryId)}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-600">
												{getCategory(categoryId)?.displayName}
												<span class={`inline-block h-1 w-1 rounded-full ${getCategory(categoryId)?.isPublished ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
											</span>
										{/if}
									{/each}
								</div>
							{/if}

							{#if (projectAttributes[project.id] ?? []).length > 0}
								<div class="flex flex-wrap gap-x-3 gap-y-1">
									{#each projectAttributes[project.id] ?? [] as attribute (attribute.id)}
										<span class="text-[10px] text-slate-400">
											<span class="text-slate-600 font-medium">{attribute.name}:</span> {attribute.value}
											{#if attribute.showInNav}
												<span class="inline-block h-1 w-1 rounded-full bg-blue-400 ml-0.5"></span>
											{/if}
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
							<a
								href={`/admin/projects/${project.id}`}
								class="text-xs font-medium text-slate-400 hover:text-slate-700 rounded-lg px-2 py-1 hover:bg-slate-100 transition-colors duration-150"
							>
								Edit
							</a>
							<button
								type="button"
								onclick={() => startProjectEdit(project)}
								class="text-xs font-medium text-slate-400 hover:text-slate-700 rounded-lg px-2 py-1 hover:bg-slate-100 transition-colors duration-150"
							>
								Quick Edit
							</button>
							<button
								type="button"
								onclick={() => deleteProject(project.id)}
								class="text-xs font-medium text-slate-400 hover:text-red-600 rounded-lg px-2 py-1 hover:bg-red-50 transition-colors duration-150"
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
