<script lang="ts">
	import { onMount } from 'svelte';
	import ProjectEditor, { type AttributeDraft, type ProjectEditorPayload } from './ProjectEditor.svelte';

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
	let newProjectAttributes = $state<AttributeDraft[]>([]);

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
			projects = await response.json();
			projectCategoryIds = {};
			projectAttributes = {};
			for (const project of projects) {
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
		await createProjectAttributes(created.id, newProjectAttributes);
		newProjectName = '';
		newProjectDisplayName = '';
		newProjectDescription = '';
		newProjectIsPublished = false;
		newProjectCategoryIds = [];
		newProjectAttributes = [];
		projectsSuccess = 'Project created.';
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
		projects = projects.map((project) => (project.id === updated.id ? updated : project));
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

		projects = projects.filter((project) => project.id !== projectId);
		const { [projectId]: _removed, ...rest } = projectCategoryIds;
		projectCategoryIds = rest;
		const { [projectId]: _removedAttributes, ...restAttributes } = projectAttributes;
		projectAttributes = restAttributes;
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

	async function createProjectAttributes(projectId: number, attributes: AttributeDraft[]) {
		const token = await getToken();
		if (!token) {
			projectsError = 'Sign in to add project attributes.';
			return;
		}

		const cleaned = sanitizeAttributes(attributes);
		if (!cleaned) {
			return;
		}
		if (cleaned.length === 0) {
			projectAttributes = { ...projectAttributes, [projectId]: [] };
			return;
		}

		const response = await fetch(`/api/projects/${projectId}/attributes`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ attributes: cleaned })
		});
		if (!response.ok) {
			projectsError = 'Unable to add project attributes.';
			return;
		}
		const created = (await response.json()) as ProjectAttribute[];
		projectAttributes = { ...projectAttributes, [projectId]: created };
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

	function createAttributeDraft(): AttributeDraft {
		return {
			name: '',
			value: '',
			showInNav: false,
			isPublished: false
		};
	}

	function addAttributeRow(list: AttributeDraft[]) {
		return [...list, createAttributeDraft()];
	}

	function updateAttributeRow(
		list: AttributeDraft[],
		index: number,
		patch: Partial<AttributeDraft>
	) {
		return list.map((attribute, i) => (i === index ? { ...attribute, ...patch } : attribute));
	}

	function removeAttributeRow(list: AttributeDraft[], index: number) {
		return list.filter((_, i) => i !== index);
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

	<form class="space-y-4 mb-6 pb-6 border-b border-walnut/5" onsubmit={createProject}>
		<div class="flex flex-wrap gap-3">
			<input
				bind:value={newProjectName}
				required
				class="w-32 px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white/50 placeholder-ash/50 focus:outline-none focus:border-walnut/30"
				placeholder="url-slug"
			/>
			<input
				bind:value={newProjectDisplayName}
				class="w-40 px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white/50 placeholder-ash/50 focus:outline-none focus:border-walnut/30"
				placeholder="Display Name"
			/>
		</div>
		<div>
			<textarea
				bind:value={newProjectDescription}
				rows="2"
				class="w-full px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white/50 placeholder-ash/50 focus:outline-none focus:border-walnut/30"
				placeholder="Brief description..."
			></textarea>
		</div>
		<div>
			<p class="text-xs text-ash mb-2">Categories</p>
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
		<div>
			<div class="flex items-center justify-between mb-2">
				<p class="text-xs text-ash">Attributes</p>
				<button
					type="button"
					onclick={() => (newProjectAttributes = addAttributeRow(newProjectAttributes))}
					class="text-xs text-copper hover:text-walnut"
				>
					Add attribute
				</button>
			</div>
			{#if newProjectAttributes.length === 0}
				<p class="mt-2 text-xs text-ash">No attributes yet.</p>
			{:else}
				<div class="mt-2 grid gap-2">
					{#each newProjectAttributes as attribute, index (index)}
						<div class="flex flex-wrap items-center gap-2 rounded-lg border border-walnut/10 bg-cream/60 p-2">
							<input
								class="flex-1 min-w-[160px] rounded-md border border-walnut/20 px-3 py-2 text-xs"
								placeholder="Name"
								value={attribute.name}
								oninput={(event) =>
									(newProjectAttributes = updateAttributeRow(newProjectAttributes, index, {
										name: (event.target as HTMLInputElement).value
									}))}
							/>
							<input
								class="flex-1 min-w-[200px] rounded-md border border-walnut/20 px-3 py-2 text-xs"
								placeholder="Value"
								value={attribute.value}
								oninput={(event) =>
									(newProjectAttributes = updateAttributeRow(newProjectAttributes, index, {
										value: (event.target as HTMLInputElement).value
									}))}
							/>
							<label class="flex items-center gap-1 text-[11px] text-ash">
								<input
									type="checkbox"
									checked={attribute.showInNav}
									onchange={(event) =>
										(newProjectAttributes = updateAttributeRow(newProjectAttributes, index, {
											showInNav: (event.target as HTMLInputElement).checked
										}))}
									class="accent-copper"
								/>
								Show in nav
							</label>
							<label class="flex items-center gap-1 text-[11px] text-ash">
								<input
									type="checkbox"
									checked={attribute.isPublished}
									onchange={(event) =>
										(newProjectAttributes = updateAttributeRow(newProjectAttributes, index, {
											isPublished: (event.target as HTMLInputElement).checked
										}))}
									class="accent-copper"
								/>
								Published
							</label>
							<button
								type="button"
								onclick={() =>
									(newProjectAttributes = removeAttributeRow(newProjectAttributes, index))}
								class="text-xs text-red-600 hover:text-red-700"
							>
								Remove
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		<div class="flex items-center gap-4">
			<label class="flex items-center gap-2 text-xs text-ash cursor-pointer hover:text-walnut">
				<input type="checkbox" bind:checked={newProjectIsPublished} class="w-3.5 h-3.5 rounded border-walnut/30 text-copper focus:ring-0 focus:ring-offset-0" />
				Publish
			</label>
			<button
				type="submit"
				class="px-4 py-1.5 text-xs bg-[#F5F1EB] text-walnut border border-walnut/20 rounded-full hover:bg-walnut hover:text-cream hover:border-walnut transition-colors"
			>
				Add Project
			</button>
		</div>
	</form>

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
