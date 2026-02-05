<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { useClerkContext } from 'svelte-clerk';
	import { adminStore } from '$lib/stores/admin.svelte';
	import type { AttributeDraft } from './ProjectEditor.svelte';

	let { children } = $props();
	const ctx = useClerkContext();
	const isSignedIn = $derived(ctx.auth.userId !== null);
	const activeProjectId = $derived(Number($page.params?.id ?? 0));

	let showCategoryModal = $state(false);
	let showProjectModal = $state(false);
	let navError = $state('');
	let navSuccess = $state('');

	let newCategoryName = $state('');
	let newCategoryDisplayName = $state('');
	let newCategoryIsPublished = $state(false);

	let newProjectName = $state('');
	let newProjectDisplayName = $state('');
	let newProjectDescription = $state('');
	let newProjectIsPublished = $state(false);
	let newProjectCategoryIds = $state<number[]>([]);
	let newProjectAttributes = $state<AttributeDraft[]>([]);

	async function getToken() {
		const clerk = ctx.clerk;
		const session = clerk?.session;
		if (!session) return null;
		return session.getToken();
	}

	async function fetchCategories() {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch('/api/categories', { headers });
		if (!response.ok) {
			throw new Error('Failed to load categories');
		}
		adminStore.categories = await response.json();
		adminStore.categoriesLoaded = true;
	}

	async function fetchProjects() {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch('/api/projects', { headers });
		if (!response.ok) {
			throw new Error('Failed to load projects');
		}
		adminStore.projects = await response.json();
		adminStore.projectsLoaded = true;
	}

	async function loadNavData() {
		navError = '';
		try {
			await Promise.all([fetchCategories(), fetchProjects()]);
		} catch (err) {
			console.error(err);
			navError = err instanceof Error ? err.message : 'Unable to load admin data.';
		}
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

	function toggleCategory(ids: number[], categoryId: number) {
		if (ids.includes(categoryId)) {
			return ids.filter((id) => id !== categoryId);
		}
		return [...ids, categoryId];
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
				navError = 'Attributes need both a name and a value.';
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

	async function updateProjectCategories(projectId: number, desiredIds: number[]) {
		const token = await getToken();
		if (!token) {
			navError = 'Sign in to update project categories.';
			return;
		}

		if (desiredIds.length > 0) {
			const response = await fetch(`/api/projects/${projectId}/categories`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ category_ids: desiredIds })
			});
			if (!response.ok) {
				navError = 'Unable to add project categories.';
				return;
			}
		}
	}

	async function createProjectAttributes(projectId: number, attributes: AttributeDraft[]) {
		const token = await getToken();
		if (!token) {
			navError = 'Sign in to add project attributes.';
			return;
		}

		const cleaned = sanitizeAttributes(attributes);
		if (!cleaned) {
			return;
		}
		if (cleaned.length === 0) {
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
			navError = 'Unable to add project attributes.';
			return;
		}
	}

	async function handleCreateCategory(event: Event) {
		event.preventDefault();
		navError = '';
		navSuccess = '';

		const token = await getToken();
		if (!token) {
			navError = 'Sign in to create categories.';
			return;
		}

		const response = await fetch('/api/categories', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				name: newCategoryName.trim(),
				displayName: newCategoryDisplayName.trim(),
				isPublished: newCategoryIsPublished
			})
		});

		if (!response.ok) {
			navError = 'Unable to create category.';
			return;
		}

		const created = await response.json();
		adminStore.categories = [created, ...adminStore.categories];
		adminStore.categoriesLoaded = true;
		newCategoryName = '';
		newCategoryDisplayName = '';
		newCategoryIsPublished = false;
		showCategoryModal = false;
		navSuccess = 'Category created.';
	}

	async function handleCreateProject(event: Event) {
		event.preventDefault();
		navError = '';
		navSuccess = '';

		const token = await getToken();
		if (!token) {
			navError = 'Sign in to create projects.';
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
			navError = 'Unable to create project.';
			return;
		}

		const created = await response.json();
		adminStore.projects = [created, ...adminStore.projects];
		adminStore.projectsLoaded = true;
		await updateProjectCategories(created.id, newProjectCategoryIds);
		await createProjectAttributes(created.id, newProjectAttributes);
		newProjectName = '';
		newProjectDisplayName = '';
		newProjectDescription = '';
		newProjectIsPublished = false;
		newProjectCategoryIds = [];
		newProjectAttributes = [];
		showProjectModal = false;
		navSuccess = 'Project created.';
	}

	onMount(() => {
		if (isSignedIn) {
			void loadNavData();
		}
	});
</script>

<div class="bg-cream text-walnut h-screen overflow-hidden">
	<div class="h-full flex">
		<aside class="w-72 shrink-0 border-r border-walnut/10 bg-[#F2EDE6] px-6 py-6 flex flex-col gap-6 overflow-y-auto">
			<div>
				<p class="text-[11px] uppercase tracking-[0.35em] text-ash">Admin</p>
				<a href="/admin" class="mt-3 inline-flex text-lg font-display text-walnut hover:text-copper">
					Dashboard
				</a>
			</div>

			<div class="flex flex-col gap-2">
				<button
					type="button"
					onclick={() => (showCategoryModal = true)}
					class="w-full rounded-full border border-walnut/20 px-3 py-2 text-xs uppercase tracking-[0.22em] text-walnut hover:bg-walnut/5"
				>
					New Category
				</button>
				<button
					type="button"
					onclick={() => (showProjectModal = true)}
					class="w-full rounded-full border border-walnut/20 px-3 py-2 text-xs uppercase tracking-[0.22em] text-walnut hover:bg-walnut/5"
				>
					New Project
				</button>
			</div>

			<div class="flex-1 min-h-0 overflow-y-auto space-y-6 pr-1">
				<div>
					<div class="flex items-center justify-between">
						<p class="text-[11px] uppercase tracking-[0.3em] text-ash">Categories</p>
					</div>
					{#if adminStore.categoriesLoaded}
						{#if adminStore.categories.length === 0}
							<p class="mt-3 text-xs text-ash">No categories yet.</p>
						{:else}
							<ul class="mt-3 space-y-1">
								{#each adminStore.categories as category (category.id)}
									<li class="flex items-center justify-between text-xs text-walnut">
										<span>{category.displayName || category.name}</span>
										<span class="text-[10px] text-ash">/{category.name}</span>
									</li>
								{/each}
							</ul>
						{/if}
					{:else}
						<p class="mt-3 text-xs text-ash">Loading categories...</p>
					{/if}
				</div>

				<div>
					<div class="flex items-center justify-between">
						<p class="text-[11px] uppercase tracking-[0.3em] text-ash">Projects</p>
					</div>
					{#if adminStore.projectsLoaded}
						{#if adminStore.projects.length === 0}
							<p class="mt-3 text-xs text-ash">No projects yet.</p>
						{:else}
							<ul class="mt-3 space-y-1">
								{#each adminStore.projects as project (project.id)}
									<li>
										<a
											href={`/admin/projects/${project.id}`}
											class={`flex items-center justify-between rounded-md px-2 py-1 text-xs transition-colors ${
												activeProjectId === project.id
													? 'bg-walnut text-cream'
													: 'text-walnut hover:bg-walnut/10'
											}`}
										>
											<span>{project.displayName || project.name}</span>
											<span class={`text-[10px] ${activeProjectId === project.id ? 'text-cream/70' : 'text-ash'}`}>
												/{project.name}
											</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					{:else}
						<p class="mt-3 text-xs text-ash">Loading projects...</p>
					{/if}
				</div>
			</div>

			<div class="text-xs text-ash">
				{#if navError}
					<p class="text-red-600">{navError}</p>
				{/if}
				{#if navSuccess}
					<p class="text-emerald-700">{navSuccess}</p>
				{/if}
			</div>
		</aside>

		<main class="flex-1 min-w-0 overflow-y-auto">
			<div class="px-6 sm:px-10 py-8 min-h-full">
				{@render children()}
			</div>
		</main>
	</div>
</div>

{#if showCategoryModal}
	<div class="fixed inset-0 z-50">
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			aria-label="Close modal"
			onclick={() => (showCategoryModal = false)}
		></button>
		<div class="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
			<div class="pointer-events-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-walnut/20">
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-display text-xl text-walnut">New Category</h3>
					<button type="button" class="text-ash hover:text-walnut" onclick={() => (showCategoryModal = false)}>
						Close
					</button>
				</div>
				<form class="space-y-4" onsubmit={handleCreateCategory}>
					<input
						bind:value={newCategoryName}
						required
						class="w-full px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white/80 placeholder-ash/50 focus:outline-none focus:border-walnut/30"
						placeholder="url-slug"
					/>
					<input
						bind:value={newCategoryDisplayName}
						class="w-full px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white/80 placeholder-ash/50 focus:outline-none focus:border-walnut/30"
						placeholder="Display Name"
					/>
					<label class="flex items-center gap-2 text-xs text-ash cursor-pointer hover:text-walnut">
						<input type="checkbox" bind:checked={newCategoryIsPublished} class="w-3.5 h-3.5 rounded border-walnut/30 text-copper focus:ring-0 focus:ring-offset-0" />
						Publish
					</label>
					<div class="flex items-center justify-end gap-2">
						<button
							type="button"
							onclick={() => (showCategoryModal = false)}
							class="px-4 py-2 text-xs border border-walnut/20 rounded-full text-ash hover:text-walnut"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="px-4 py-2 text-xs bg-walnut text-cream rounded-full hover:bg-copper transition-colors"
						>
							Create
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

{#if showProjectModal}
	<div class="fixed inset-0 z-50">
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			aria-label="Close modal"
			onclick={() => (showProjectModal = false)}
		></button>
		<div class="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
			<div class="pointer-events-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-walnut/20">
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-display text-xl text-walnut">New Project</h3>
					<button type="button" class="text-ash hover:text-walnut" onclick={() => (showProjectModal = false)}>
						Close
					</button>
				</div>
				<form class="space-y-4" onsubmit={handleCreateProject}>
					<div class="grid gap-3 sm:grid-cols-2">
						<input
							bind:value={newProjectName}
							required
							class="w-full px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white/80 placeholder-ash/50 focus:outline-none focus:border-walnut/30"
							placeholder="url-slug"
						/>
						<input
							bind:value={newProjectDisplayName}
							class="w-full px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white/80 placeholder-ash/50 focus:outline-none focus:border-walnut/30"
							placeholder="Display Name"
						/>
					</div>
					<textarea
						bind:value={newProjectDescription}
						rows="2"
						class="w-full px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white/80 placeholder-ash/50 focus:outline-none focus:border-walnut/30"
						placeholder="Brief description..."
					></textarea>
					<div>
						<p class="text-xs text-ash mb-2">Categories</p>
						{#if adminStore.categoriesLoaded}
							{#if adminStore.categories.length === 0}
								<p class="text-xs text-ash">Create a category first.</p>
							{:else}
								<div class="flex flex-wrap gap-2">
									{#each adminStore.categories as category (category.id)}
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
											<span class={isSelected ? 'font-semibold' : ''}>{category.displayName || category.name}</span>
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
						{:else}
							<p class="text-xs text-ash">Loading categories...</p>
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
							<p class="text-xs text-ash">No attributes yet.</p>
						{:else}
							<div class="grid gap-2">
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
					<label class="flex items-center gap-2 text-xs text-ash cursor-pointer hover:text-walnut">
						<input type="checkbox" bind:checked={newProjectIsPublished} class="w-3.5 h-3.5 rounded border-walnut/30 text-copper focus:ring-0 focus:ring-offset-0" />
						Publish
					</label>
					<div class="flex items-center justify-end gap-2">
						<button
							type="button"
							onclick={() => (showProjectModal = false)}
							class="px-4 py-2 text-xs border border-walnut/20 rounded-full text-ash hover:text-walnut"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="px-4 py-2 text-xs bg-walnut text-cream rounded-full hover:bg-copper transition-colors"
						>
							Create
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
