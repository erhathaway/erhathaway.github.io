<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { useClerkContext } from 'svelte-clerk';
	import { adminStore } from '$lib/stores/admin.svelte';
	import { artifactSchemas } from '$lib/schemas/artifacts';
	import ExportImportModal from './ExportImportModal.svelte';
	import type { AttributeDraft } from './ProjectEditor.svelte';

	let { children, data } = $props();
	const ctx = useClerkContext();
	const isSignedIn = $derived(ctx.auth.userId !== null);
	const activeProjectId = $derived(Number($page.params?.id ?? 0));

	let showCategoryModal = $state(false);
	let showProjectModal = $state(false);
	let showEditCategoryModal = $state(false);
	let showExportImportModal = $state(false);
	let navError = $state('');
	let navSuccess = $state('');
	let googlePhotosConnected = $state(false);
	let mainDragOver = $state(false);
	let showClearAllModal = $state(false);
	let clearConfirmText = $state('');
	let clearingData = $state(false);

	let newCategoryName = $state('');
	let newCategoryDisplayName = $state('');
	let newCategoryIsPublished = $state(false);

	let editCategoryId = $state<number | null>(null);
	let editCategoryName = $state('');
	let editCategoryDisplayName = $state('');
	let editCategoryIsPublished = $state(false);

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
		const response = await fetch('/api/admin/categories', { headers });
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
		const response = await fetch('/api/admin/projects', { headers });
		if (!response.ok) {
			throw new Error('Failed to load projects');
		}
		adminStore.projects = await response.json();
		adminStore.projectsLoaded = true;
	}

	async function fetchGooglePhotosStatus() {
		try {
			const token = await getToken();
			if (!token) return;
			const response = await fetch('/api/admin/integrations/google-photos/status', {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (response.ok) {
				const data = await response.json();
				googlePhotosConnected = data.connected;
			}
		} catch {
			// Non-critical, leave as disconnected
		}
	}

	async function loadNavData() {
		navError = '';
		try {
			await Promise.all([fetchCategories(), fetchProjects(), fetchGooglePhotosStatus()]);
		} catch (err) {
			console.error(err);
			navError = err instanceof Error ? err.message : 'Unable to load admin data.';
		}
	}

	async function handleClearAllData() {
		clearingData = true;
		navError = '';
		navSuccess = '';
		try {
			const token = await getToken();
			if (!token) {
				navError = 'Sign in to clear data.';
				return;
			}
			const response = await fetch('/api/admin/clear-all-data', {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) {
				const body = await response.json().catch(() => null);
				navError = body?.message || 'Failed to clear data.';
				return;
			}
			navSuccess = 'All data cleared.';
			showClearAllModal = false;
			clearConfirmText = '';
			await loadNavData();
		} catch (err) {
			navError = err instanceof Error ? err.message : 'Failed to clear data.';
		} finally {
			clearingData = false;
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
			const response = await fetch(`/api/admin/projects/${projectId}/categories`, {
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

		const response = await fetch(`/api/admin/projects/${projectId}/attributes`, {
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

		const response = await fetch('/api/admin/categories', {
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

	function startEditCategory(category: { id: number; name: string; displayName: string; isPublished: boolean }) {
		editCategoryId = category.id;
		editCategoryName = category.name;
		editCategoryDisplayName = category.displayName;
		editCategoryIsPublished = category.isPublished;
		showEditCategoryModal = true;
	}

	function cancelEditCategory() {
		editCategoryId = null;
		editCategoryName = '';
		editCategoryDisplayName = '';
		editCategoryIsPublished = false;
		showEditCategoryModal = false;
	}

	async function handleEditCategory(event: Event) {
		event.preventDefault();
		if (editCategoryId === null) return;
		navError = '';
		navSuccess = '';

		const token = await getToken();
		if (!token) {
			navError = 'Sign in to update categories.';
			return;
		}

		const response = await fetch(`/api/admin/categories/${editCategoryId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				name: editCategoryName.trim(),
				displayName: editCategoryDisplayName.trim(),
				isPublished: editCategoryIsPublished
			})
		});

		if (!response.ok) {
			navError = 'Unable to update category.';
			return;
		}

		const updated = await response.json();
		adminStore.categories = adminStore.categories.map((c) => (c.id === updated.id ? updated : c));
		cancelEditCategory();
		navSuccess = 'Category updated.';
	}

	async function handleDeleteCategory() {
		if (editCategoryId === null) return;
		navError = '';
		navSuccess = '';

		const token = await getToken();
		if (!token) {
			navError = 'Sign in to delete categories.';
			return;
		}

		const response = await fetch(`/api/admin/categories/${editCategoryId}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok) {
			navError = 'Unable to delete category.';
			return;
		}

		adminStore.categories = adminStore.categories.filter((c) => c.id !== editCategoryId);
		cancelEditCategory();
		navSuccess = 'Category deleted.';
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

		const response = await fetch('/api/admin/projects', {
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

		function onDragActive() {
			mainDragOver = true;
		}
		function onDragInactive() { mainDragOver = false; }
		window.addEventListener('admin-drag-active', onDragActive);
		window.addEventListener('admin-drag-inactive', onDragInactive);
		return () => {
			window.removeEventListener('admin-drag-active', onDragActive);
			window.removeEventListener('admin-drag-inactive', onDragInactive);
		};
	});
</script>

<div class="bg-[#fafafa] text-slate-900 h-screen overflow-hidden">
	<div class="h-full flex">
		<aside class="w-72 shrink-0 border-r border-slate-200 bg-white px-5 py-5 flex flex-col gap-5 overflow-y-auto">
			<!-- Brand -->
			<div class="pb-4 border-b border-slate-100">
				<a href="/admin" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-600 transition-colors duration-150">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
					</svg>
					Admin
				</a>
			</div>

			<!-- Actions -->
			<div class="flex flex-col gap-2">
				<button
					type="button"
					onclick={() => (showCategoryModal = true)}
					class="w-full flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all duration-150"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					New Category
				</button>
				<button
					type="button"
					onclick={() => (showProjectModal = true)}
					class="w-full flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all duration-150"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					New Project
				</button>
				<button
					type="button"
					onclick={() => (showExportImportModal = true)}
					class="w-full flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all duration-150"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
					</svg>
					Export / Import
				</button>
				{#if data.isDev}
					<button
						type="button"
						onclick={() => (showClearAllModal = true)}
						class="w-full flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:border-red-400 hover:bg-red-50 transition-all duration-150"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
						Clear All Data
					</button>
				{/if}
			</div>

			<!-- Nav Lists -->
			<div class="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
				<!-- Categories -->
				<div>
					<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Categories</p>
					{#if adminStore.categoriesLoaded}
						{#if adminStore.categories.length === 0}
							<p class="text-xs text-slate-400">No categories yet.</p>
						{:else}
							<ul class="space-y-0.5">
								{#each adminStore.categories as category (category.id)}
									<li
										class="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors duration-150 cursor-pointer select-none"
										ondblclick={() => startEditCategory(category)}
										role="button"
										tabindex="0"
										onkeydown={(event) => {
											if (event.key === 'Enter') startEditCategory(category);
										}}
									>
										<span class="font-medium">{category.displayName || category.name}</span>
										<div class="flex items-center gap-2">
											<span class="text-[10px] font-mono text-slate-400">/{category.name}</span>
											<span class={`inline-block h-1.5 w-1.5 rounded-full ${category.isPublished ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					{:else}
						<p class="text-xs text-slate-400">Loading...</p>
					{/if}
				</div>

				<!-- Projects -->
				<div>
					<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Projects</p>
					{#if adminStore.projectsLoaded}
						{#if adminStore.projects.length === 0}
							<p class="text-xs text-slate-400">No projects yet.</p>
						{:else}
							<ul class="space-y-0.5">
								{#each adminStore.projects as project (project.id)}
									<li>
										<a
											href={`/admin/projects/${project.id}`}
											class={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 ${
												activeProjectId === project.id
													? 'bg-slate-900 text-white'
													: 'text-slate-600 hover:bg-slate-50'
											}`}
										>
											<span class="font-medium">{project.displayName || project.name}</span>
											<span class={`text-[10px] font-mono ${activeProjectId === project.id ? 'text-white/50' : 'text-slate-400'}`}>
												/{project.name}
											</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					{:else}
						<p class="text-xs text-slate-400">Loading...</p>
					{/if}
				</div>

				<!-- Integrations -->
				<div>
					<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Integrations</p>
					<ul class="space-y-0.5">
						<li>
							<a
								href="/admin/integrations/google-photos"
								class={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 ${
									$page.url.pathname === '/admin/integrations/google-photos'
										? 'bg-slate-900 text-white'
										: 'text-slate-600 hover:bg-slate-50'
								}`}
							>
								<span class="font-medium">Google Photos</span>
								<span class={`inline-block h-1.5 w-1.5 rounded-full ${googlePhotosConnected ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
							</a>
						</li>
					</ul>
				</div>

				<!-- Schemas -->
				<div>
					<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Schemas</p>
					<ul class="space-y-0.5">
						{#each artifactSchemas as schema (schema.name)}
							<li>
								<a
									href={`/admin/schemas/${schema.name}`}
									class={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 ${
										$page.url.pathname === '/admin/schemas/' + schema.name
											? 'bg-slate-900 text-white'
											: 'text-slate-600 hover:bg-slate-50'
									}`}
								>
									<span class="font-medium">{schema.label}</span>
									<span class={`text-[10px] font-mono ${$page.url.pathname === '/admin/schemas/' + schema.name ? 'text-white/50' : 'text-slate-400'}`}>{schema.name}</span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			</div>

			<!-- Back to site -->
			<a
				href="/"
				class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors duration-150"
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Back to site
			</a>

			<!-- Status -->
			{#if navError || navSuccess}
				<div class="text-xs pt-3 border-t border-slate-100">
					{#if navError}
						<p class="text-red-600">{navError}</p>
					{/if}
					{#if navSuccess}
						<p class="text-emerald-600">{navSuccess}</p>
					{/if}
				</div>
			{/if}
		</aside>

		<main class="flex-1 min-w-0 overflow-y-auto relative">
			<div class="px-6 sm:px-10 py-8 min-h-full">
				{@render children()}
			</div>
			{#if mainDragOver}
				<div class="absolute inset-0 z-[999] flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none">
					<div class="flex flex-col items-center gap-3 rounded-2xl bg-white px-10 py-8 shadow-2xl">
						<svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
						</svg>
						<span class="text-sm font-medium text-slate-600">Drop to upload</span>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>

<!-- New Category Modal -->
{#if showCategoryModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			aria-label="Close modal"
			onclick={() => (showCategoryModal = false)}
		></button>
		<div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
				<h3 class="text-base font-semibold text-slate-900">New Category</h3>
				<button
					type="button"
					class="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					onclick={() => (showCategoryModal = false)}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Body -->
			<form class="px-6 py-5 grid gap-4" onsubmit={handleCreateCategory}>
				<label class="grid gap-1.5">
					<span class="text-xs font-medium text-slate-600">URL slug</span>
					<input
						bind:value={newCategoryName}
						required
						class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 font-mono placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
						placeholder="url-slug"
					/>
				</label>
				<label class="grid gap-1.5">
					<span class="text-xs font-medium text-slate-600">Display Name</span>
					<input
						bind:value={newCategoryDisplayName}
						class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
						placeholder="Display Name"
					/>
				</label>
				<div class="flex items-center gap-3">
					<button
						type="button"
						role="switch"
						aria-checked={newCategoryIsPublished}
						aria-label="Toggle published"
						onclick={() => { newCategoryIsPublished = !newCategoryIsPublished; }}
						class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${newCategoryIsPublished ? 'bg-emerald-500' : 'bg-slate-200'}`}
					>
						<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${newCategoryIsPublished ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
					</button>
					<span class="text-sm text-slate-600">Published</span>
				</div>

				<!-- Footer -->
				<div class="flex items-center gap-2.5 pt-3 border-t border-slate-100 mt-1">
					<button
						type="submit"
						class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
					>
						Create
					</button>
					<button
						type="button"
						onclick={() => (showCategoryModal = false)}
						class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- New Project Modal -->
{#if showProjectModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			aria-label="Close modal"
			onclick={() => (showProjectModal = false)}
		></button>
		<div class="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
				<h3 class="text-base font-semibold text-slate-900">New Project</h3>
				<button
					type="button"
					class="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					onclick={() => (showProjectModal = false)}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Body -->
			<form class="px-6 py-5 grid gap-5" onsubmit={handleCreateProject}>
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="grid gap-1.5">
						<span class="text-xs font-medium text-slate-600">URL slug</span>
						<input
							bind:value={newProjectName}
							required
							class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 font-mono placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
							placeholder="url-slug"
						/>
					</label>
					<label class="grid gap-1.5">
						<span class="text-xs font-medium text-slate-600">Display Name</span>
						<input
							bind:value={newProjectDisplayName}
							class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
							placeholder="Display Name"
						/>
					</label>
				</div>
				<label class="grid gap-1.5">
					<span class="text-xs font-medium text-slate-600">Description</span>
					<textarea
						bind:value={newProjectDescription}
						rows="2"
						class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
						placeholder="Brief description..."
					></textarea>
				</label>

				<!-- Categories -->
				<div>
					<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2.5">Categories</p>
					{#if adminStore.categoriesLoaded}
						{#if adminStore.categories.length === 0}
							<p class="text-xs text-slate-400">Create a category first.</p>
						{:else}
							<div class="flex flex-wrap gap-2">
								{#each adminStore.categories as category (category.id)}
									{@const isSelected = newProjectCategoryIds.includes(category.id)}
									<button
										type="button"
										onclick={() =>
											(newProjectCategoryIds = toggleCategory(newProjectCategoryIds, category.id))}
										class={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
											isSelected
												? 'bg-slate-900 text-white border-slate-900'
												: 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
										}`}
									>
										{category.displayName || category.name}
										<span class={`inline-block h-1.5 w-1.5 rounded-full ${
											isSelected
												? (category.isPublished ? 'bg-emerald-400' : 'bg-slate-500')
												: (category.isPublished ? 'bg-emerald-400' : 'bg-slate-300')
										}`}></span>
									</button>
								{/each}
							</div>
						{/if}
					{:else}
						<p class="text-xs text-slate-400">Loading categories...</p>
					{/if}
				</div>

				<!-- Attributes -->
				<div>
					<div class="flex items-center justify-between mb-2.5">
						<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Attributes</p>
						<button
							type="button"
							onclick={() => (newProjectAttributes = addAttributeRow(newProjectAttributes))}
							class="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors duration-150"
						>
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							Add
						</button>
					</div>
					{#if newProjectAttributes.length === 0}
						<p class="text-xs text-slate-400">No attributes yet.</p>
					{:else}
						<div class="grid gap-2">
							{#each newProjectAttributes as attribute, index (index)}
								<div class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
									<input
										class="flex-1 min-w-[140px] rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
										placeholder="Name"
										value={attribute.name}
										oninput={(event) =>
											(newProjectAttributes = updateAttributeRow(newProjectAttributes, index, {
												name: (event.target as HTMLInputElement).value
											}))}
									/>
									<input
										class="flex-1 min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
										placeholder="Value"
										value={attribute.value}
										oninput={(event) =>
											(newProjectAttributes = updateAttributeRow(newProjectAttributes, index, {
												value: (event.target as HTMLInputElement).value
											}))}
									/>
									<div class="flex items-center gap-3">
										<label class="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
											<input
												type="checkbox"
												checked={attribute.showInNav}
												onchange={(event) =>
													(newProjectAttributes = updateAttributeRow(newProjectAttributes, index, {
														showInNav: (event.target as HTMLInputElement).checked
													}))}
												class="accent-blue-500 w-3 h-3"
											/>
											Nav
										</label>
										<label class="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
											<input
												type="checkbox"
												checked={attribute.isPublished}
												onchange={(event) =>
													(newProjectAttributes = updateAttributeRow(newProjectAttributes, index, {
														isPublished: (event.target as HTMLInputElement).checked
													}))}
												class="accent-emerald-500 w-3 h-3"
											/>
											Pub
										</label>
									</div>
									<button
										type="button"
										onclick={() =>
											(newProjectAttributes = removeAttributeRow(newProjectAttributes, index))}
										class="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors duration-150"
									>
										Remove
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Published toggle -->
				<div class="flex items-center gap-3">
					<button
						type="button"
						role="switch"
						aria-checked={newProjectIsPublished}
						aria-label="Toggle published"
						onclick={() => { newProjectIsPublished = !newProjectIsPublished; }}
						class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${newProjectIsPublished ? 'bg-emerald-500' : 'bg-slate-200'}`}
					>
						<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${newProjectIsPublished ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
					</button>
					<span class="text-sm text-slate-600">Published</span>
				</div>

				<!-- Footer -->
				<div class="flex items-center gap-2.5 pt-3 border-t border-slate-100 mt-1">
					<button
						type="submit"
						class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
					>
						Create
					</button>
					<button
						type="button"
						onclick={() => (showProjectModal = false)}
						class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Export / Import Modal -->
{#if showExportImportModal}
	<ExportImportModal
		open={showExportImportModal}
		categories={adminStore.categories}
		projects={adminStore.projects}
		{getToken}
		onClose={() => {
			showExportImportModal = false;
		}}
		onComplete={(message) => {
			navSuccess = message;
			showExportImportModal = false;
			void loadNavData();
		}}
	/>
{/if}

<!-- Clear All Data Modal -->
{#if showClearAllModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			aria-label="Close modal"
			onclick={() => { showClearAllModal = false; clearConfirmText = ''; }}
		></button>
		<div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-red-100">
				<h3 class="text-base font-semibold text-red-600">Clear All Data</h3>
				<button
					type="button"
					class="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					onclick={() => { showClearAllModal = false; clearConfirmText = ''; }}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Body -->
			<div class="px-6 py-5 grid gap-4">
				<p class="text-sm text-slate-600">
					This will permanently delete <strong>all projects, categories, integrations, settings, and uploaded files</strong>. This cannot be undone.
				</p>
				<label class="grid gap-1.5">
					<span class="text-xs font-medium text-slate-600">Type <strong>DELETE</strong> to confirm</span>
					<input
						bind:value={clearConfirmText}
						class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 font-mono placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-900/10 transition-all duration-150"
						placeholder="DELETE"
					/>
				</label>

				<!-- Footer -->
				<div class="flex items-center gap-2.5 pt-3 border-t border-slate-100 mt-1">
					<button
						type="button"
						disabled={clearConfirmText !== 'DELETE' || clearingData}
						onclick={handleClearAllData}
						class="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{clearingData ? 'Clearing...' : 'Clear All Data'}
					</button>
					<button
						type="button"
						onclick={() => { showClearAllModal = false; clearConfirmText = ''; }}
						class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Category Modal -->
{#if showEditCategoryModal && editCategoryId !== null}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			aria-label="Close modal"
			onclick={cancelEditCategory}
		></button>
		<div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
				<h3 class="text-base font-semibold text-slate-900">Edit Category</h3>
				<button
					type="button"
					class="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					onclick={cancelEditCategory}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Body -->
			<form class="px-6 py-5 grid gap-4" onsubmit={handleEditCategory}>
				<label class="grid gap-1.5">
					<span class="text-xs font-medium text-slate-600">URL slug</span>
					<input
						bind:value={editCategoryName}
						required
						class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 font-mono placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
						placeholder="url-slug"
					/>
				</label>
				<label class="grid gap-1.5">
					<span class="text-xs font-medium text-slate-600">Display Name</span>
					<input
						bind:value={editCategoryDisplayName}
						class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
						placeholder="Display Name"
					/>
				</label>
				<div class="flex items-center gap-3">
					<button
						type="button"
						role="switch"
						aria-checked={editCategoryIsPublished}
						aria-label="Toggle published"
						onclick={() => { editCategoryIsPublished = !editCategoryIsPublished; }}
						class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${editCategoryIsPublished ? 'bg-emerald-500' : 'bg-slate-200'}`}
					>
						<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${editCategoryIsPublished ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
					</button>
					<span class="text-sm text-slate-600">Published</span>
				</div>

				<!-- Footer -->
				<div class="flex items-center gap-2.5 pt-3 border-t border-slate-100 mt-1">
					<button
						type="submit"
						class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
					>
						Save
					</button>
					<button
						type="button"
						onclick={handleDeleteCategory}
						class="px-4 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-150"
					>
						Delete
					</button>
					<button
						type="button"
						onclick={cancelEditCategory}
						class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
