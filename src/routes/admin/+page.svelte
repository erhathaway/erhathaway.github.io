<script lang="ts">
	import { onMount } from 'svelte';
	import { SignedIn, SignedOut, UserButton, useClerkContext } from 'svelte-clerk';

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

	const ctx = useClerkContext();

	let categories = $state<Category[]>([]);
	let filter = $state<'all' | 'published' | 'unpublished'>('all');
	let isLoading = $state(false);
	let error = $state('');
	let success = $state('');

	let newName = $state('');
	let newDisplayName = $state('');
	let newIsPublished = $state(false);

	let editingId = $state<number | null>(null);
	let editName = $state('');
	let editDisplayName = $state('');
	let editIsPublished = $state(false);

	let projects = $state<Project[]>([]);
	let projectsFilter = $state<'all' | 'published' | 'unpublished'>('all');
	let projectsLoading = $state(false);
	let projectsError = $state('');
	let projectsSuccess = $state('');

	let newProjectName = $state('');
	let newProjectDisplayName = $state('');
	let newProjectDescription = $state('');
	let newProjectIsPublished = $state(false);

	let editingProjectId = $state<number | null>(null);
	let editProjectName = $state('');
	let editProjectDisplayName = $state('');
	let editProjectDescription = $state('');
	let editProjectIsPublished = $state(false);

	const filteredCategories = $derived.by(() => {
		if (filter === 'published') {
			return categories.filter((category) => category.isPublished);
		}
		if (filter === 'unpublished') {
			return categories.filter((category) => !category.isPublished);
		}
		return categories;
	});

	const filteredProjects = $derived.by(() => {
		if (projectsFilter === 'published') {
			return projects.filter((project) => project.isPublished);
		}
		if (projectsFilter === 'unpublished') {
			return projects.filter((project) => !project.isPublished);
		}
		return projects;
	});

	async function getToken() {
		const clerk = ctx.clerk;
		const session = clerk?.session;
		if (!session) return null;
		return session.getToken();
	}

	async function fetchCategories() {
		error = '';
		isLoading = true;
		try {
			const token = await getToken();
			const headers: Record<string, string> = {};
			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}

			const response = await fetch('/api/categories', { headers });
			if (!response.ok) {
				if (response.status === 500) {
					throw new Error(
						'Cloudflare bindings are unavailable. Run `bun run dev` (do not pass --open), then open http://localhost:5173 manually.'
					);
				}
				throw new Error('Failed to load categories');
			}
			categories = await response.json();
		} catch (err) {
			console.error(err);
			error = err instanceof Error ? err.message : 'Unable to load categories.';
		} finally {
			isLoading = false;
		}
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
		} catch (err) {
			console.error(err);
			projectsError = err instanceof Error ? err.message : 'Unable to load projects.';
		} finally {
			projectsLoading = false;
		}
	}

	async function createCategory(event: Event) {
		event.preventDefault();
		error = '';
		success = '';

		const token = await getToken();
		if (!token) {
			error = 'Sign in to create categories.';
			return;
		}

		const response = await fetch('/api/categories', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				name: newName.trim(),
				displayName: newDisplayName.trim(),
				isPublished: newIsPublished
			})
		});

		if (!response.ok) {
			error = 'Unable to create category.';
			return;
		}

		const created = await response.json();
		categories = [created, ...categories];
		newName = '';
		newDisplayName = '';
		newIsPublished = false;
		success = 'Category created.';
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
		newProjectName = '';
		newProjectDisplayName = '';
		newProjectDescription = '';
		newProjectIsPublished = false;
		projectsSuccess = 'Project created.';
	}

	function startEdit(category: Category) {
		editingId = category.id;
		editName = category.name;
		editDisplayName = category.displayName;
		editIsPublished = category.isPublished;
		success = '';
		error = '';
	}

	function startProjectEdit(project: Project) {
		editingProjectId = project.id;
		editProjectName = project.name;
		editProjectDisplayName = project.displayName;
		editProjectDescription = project.description ?? '';
		editProjectIsPublished = project.isPublished;
		projectsSuccess = '';
		projectsError = '';
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
		editDisplayName = '';
		editIsPublished = false;
	}

	function cancelProjectEdit() {
		editingProjectId = null;
		editProjectName = '';
		editProjectDisplayName = '';
		editProjectDescription = '';
		editProjectIsPublished = false;
	}

	async function saveEdit() {
		if (editingId === null) return;
		error = '';
		success = '';

		const token = await getToken();
		if (!token) {
			error = 'Sign in to update categories.';
			return;
		}

		const response = await fetch(`/api/categories/${editingId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				name: editName.trim(),
				displayName: editDisplayName.trim(),
				isPublished: editIsPublished
			})
		});

		if (!response.ok) {
			error = 'Unable to update category.';
			return;
		}

		const updated = await response.json();
		categories = categories.map((category) => (category.id === updated.id ? updated : category));
		cancelEdit();
		success = 'Category updated.';
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
		cancelProjectEdit();
		projectsSuccess = 'Project updated.';
	}

	async function deleteCategory(categoryId: number) {
		error = '';
		success = '';

		const token = await getToken();
		if (!token) {
			error = 'Sign in to delete categories.';
			return;
		}

		const response = await fetch(`/api/categories/${categoryId}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok) {
			error = 'Unable to delete category.';
			return;
		}

		categories = categories.filter((category) => category.id !== categoryId);
		success = 'Category deleted.';
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
		projectsSuccess = 'Project deleted.';
	}

	onMount(fetchCategories);
	onMount(fetchProjects);
</script>

<div class="h-screen bg-cream text-walnut p-8 pb-16">
	<div class="max-w-5xl mx-auto h-full overflow-y-auto pr-2">
		<header class="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-walnut/10">
			<div>
				<h1 class="font-display text-4xl text-walnut mb-2">Admin Panel</h1>
				<p class="text-ash">Portfolio Management Dashboard</p>
			</div>
			<UserButton />
		</header>

		<SignedIn>
			<section class="bg-white/70 border border-walnut/10 rounded-2xl p-6 shadow-sm">
				<div class="flex flex-wrap items-center justify-between gap-4 mb-6">
					<div>
						<h2 class="font-display text-2xl text-walnut">Categories</h2>
						<p class="text-ash text-sm">Create, publish, and organize project categories.</p>
					</div>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={fetchCategories}
							class="px-4 py-2 rounded-full border border-walnut/20 text-sm text-walnut hover:border-copper hover:text-copper transition-colors"
						>
							Refresh
						</button>
						<select
							bind:value={filter}
							class="px-3 py-2 rounded-full border border-walnut/20 bg-white/80 text-sm"
						>
							<option value="all">All</option>
							<option value="published">Published</option>
							<option value="unpublished">Unpublished</option>
						</select>
					</div>
				</div>

				<form class="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] items-end" onsubmit={createCategory}>
					<label class="text-sm">
						<span class="text-ash">Name</span>
						<input
							bind:value={newName}
							required
							class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
							placeholder="wood"
						/>
					</label>
					<label class="text-sm">
						<span class="text-ash">Display name</span>
						<input
							bind:value={newDisplayName}
							class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
							placeholder="Wood"
						/>
					</label>
					<label class="flex items-center gap-2 text-sm text-ash">
						<input type="checkbox" bind:checked={newIsPublished} class="accent-copper" />
						Published
					</label>
					<button
						type="submit"
						class="px-4 py-2 rounded-full bg-walnut text-cream text-sm hover:bg-copper transition-colors"
					>
						Add
					</button>
				</form>

				{#if error}
					<div class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
						{error}
					</div>
				{/if}
				{#if success}
					<p class="mt-4 text-sm text-emerald-700">{success}</p>
				{/if}

				<div class="mt-6 space-y-3">
					{#if isLoading}
						<p class="text-ash text-sm">Loading categories...</p>
					{:else if filteredCategories.length === 0}
						<p class="text-ash text-sm">No categories yet.</p>
					{:else}
						{#each filteredCategories as category (category.id)}
							<div
								class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-walnut/10 bg-white px-4 py-3"
							>
								{#if editingId === category.id}
									<div class="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
										<input
											bind:value={editName}
											class="w-40 rounded-md border border-walnut/20 px-3 py-2 text-sm"
										/>
										<input
											bind:value={editDisplayName}
											class="w-56 rounded-md border border-walnut/20 px-3 py-2 text-sm"
											placeholder={editName}
										/>
										<label class="flex items-center gap-2 text-sm text-ash">
											<input type="checkbox" bind:checked={editIsPublished} class="accent-copper" />
											Published
										</label>
									</div>
									<div class="flex items-center gap-2">
										<button
											type="button"
											onclick={saveEdit}
											class="px-3 py-2 rounded-full bg-walnut text-cream text-sm hover:bg-copper transition-colors"
										>
											Save
										</button>
										<button
											type="button"
											onclick={cancelEdit}
											class="px-3 py-2 rounded-full border border-walnut/20 text-sm text-walnut hover:border-copper hover:text-copper transition-colors"
										>
											Cancel
										</button>
									</div>
								{:else}
									<div class="flex items-center gap-4 flex-1 min-w-[240px]">
										<div>
											<p class="font-medium text-walnut">{category.displayName}</p>
											<p class="text-xs text-ash">/{category.name}</p>
										</div>
										<span
											class="px-2 py-1 rounded-full text-xs border border-walnut/10 bg-cream/60 text-ash"
										>
											{category.isPublished ? 'Published' : 'Draft'}
										</span>
									</div>
									<div class="flex items-center gap-2">
										<button
											type="button"
											onclick={() => startEdit(category)}
											class="px-3 py-2 rounded-full border border-walnut/20 text-sm text-walnut hover:border-copper hover:text-copper transition-colors"
										>
											Edit
										</button>
										<button
											type="button"
											onclick={() => deleteCategory(category.id)}
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
		</SignedIn>

		<SignedOut>
			<div class="mt-8 p-4 bg-red-50 border border-red-200 rounded">
				<p class="text-red-700">You need to be signed in to access this page.</p>
			</div>
		</SignedOut>
	</div>
</div>
