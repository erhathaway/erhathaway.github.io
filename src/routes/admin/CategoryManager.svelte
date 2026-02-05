<script lang="ts">
	import { onMount } from 'svelte';

	type Category = {
		id: number;
		name: string;
		displayName: string;
		isPublished: boolean;
	};

	type Props = {
		categories: Category[];
		categoriesLoaded: boolean;
		setCategories: (next: Category[]) => void;
		setCategoriesLoaded: (next: boolean) => void;
		getToken: () => Promise<string | null>;
	};

	let { categories, categoriesLoaded, setCategories, setCategoriesLoaded, getToken } =
		$props<Props>();

	let filter = $state<'all' | 'published' | 'unpublished'>('all');
	let isLoading = $state(false);
	let error = $state('');
	let success = $state('');

	let editingId = $state<number | null>(null);
	let editName = $state('');
	let editDisplayName = $state('');
	let editIsPublished = $state(false);

	const filteredCategories = $derived.by(() => {
		if (filter === 'published') {
			return categories.filter((category) => category.isPublished);
		}
		if (filter === 'unpublished') {
			return categories.filter((category) => !category.isPublished);
		}
		return categories;
	});

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
			setCategories(await response.json());
			setCategoriesLoaded(true);
		} catch (err) {
			console.error(err);
			error = err instanceof Error ? err.message : 'Unable to load categories.';
		} finally {
			isLoading = false;
		}
	}


	function startEdit(category: Category) {
		editingId = category.id;
		editName = category.name;
		editDisplayName = category.displayName;
		editIsPublished = category.isPublished;
		success = '';
		error = '';
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
		editDisplayName = '';
		editIsPublished = false;
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
		setCategories(categories.map((category) => (category.id === updated.id ? updated : category)));
		cancelEdit();
		success = 'Category updated.';
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

		setCategories(categories.filter((category) => category.id !== categoryId));
		success = 'Category deleted.';
	}

	onMount(fetchCategories);
</script>

<section class="mb-8">
	<div class="flex flex-wrap items-center justify-between gap-4 mb-5">
		<div>
			<h2 class="text-lg font-semibold text-slate-900">Categories</h2>
			<p class="text-sm text-slate-500 mt-0.5">Manage portfolio categories</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={fetchCategories}
				disabled={isLoading}
				class="px-3.5 py-1.5 text-xs font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
			>
				{isLoading ? 'Refreshing...' : 'Refresh'}
			</button>
			<select
				bind:value={filter}
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
		Add categories from the left panel.
	</p>

	{#if error}
		<div class="flex items-start gap-2 mb-3">
			<svg class="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<p class="text-xs text-red-600">{error}</p>
		</div>
	{/if}
	{#if success}
		<div class="flex items-start gap-2 mb-3">
			<svg class="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<p class="text-xs text-emerald-600">{success}</p>
		</div>
	{/if}

	{#if isLoading}
		<div class="flex items-center gap-2 py-4">
			<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500"></div>
			<p class="text-xs text-slate-400">Loading...</p>
		</div>
	{:else if filteredCategories.length === 0}
		<p class="text-xs text-slate-400 py-4">No categories yet</p>
	{:else if editingId !== null}
		{#each filteredCategories as category (category.id)}
			{#if editingId === category.id}
				<div class="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
					<input
						bind:value={editName}
						class="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
						placeholder="url-slug"
					/>
					<input
						bind:value={editDisplayName}
						class="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
						placeholder="Display Name"
					/>
					<div class="flex items-center gap-3">
						<button
							type="button"
							role="switch"
							aria-checked={editIsPublished}
							aria-label="Toggle published"
							onclick={() => { editIsPublished = !editIsPublished; }}
							class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${editIsPublished ? 'bg-emerald-500' : 'bg-slate-200'}`}
						>
							<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${editIsPublished ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
						</button>
						<span class="text-xs text-slate-500">Published</span>
					</div>
					<div class="flex items-center gap-2 ml-auto">
						<button
							type="button"
							onclick={saveEdit}
							class="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors duration-150"
						>
							Save
						</button>
						<button
							type="button"
							onclick={cancelEdit}
							class="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors duration-150"
						>
							Cancel
						</button>
					</div>
				</div>
			{/if}
		{/each}
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each filteredCategories as category (category.id)}
				<div class="group inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all duration-150">
					<span class="text-sm font-medium text-slate-700">{category.displayName || category.name}</span>
					<span class="text-xs font-mono text-slate-400">/{category.name}</span>
					<span class={`inline-block h-1.5 w-1.5 rounded-full ${category.isPublished ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>

					<div class="flex items-center gap-1 overflow-hidden max-w-0 group-hover:max-w-[120px] transition-all duration-300">
						<span class="text-slate-200 mx-0.5">|</span>
						<button
							type="button"
							onclick={() => startEdit(category)}
							class="text-xs font-medium text-slate-400 hover:text-slate-700 rounded-lg px-1.5 py-0.5 hover:bg-slate-100 transition-colors duration-150 whitespace-nowrap"
						>
							Edit
						</button>
						<button
							type="button"
							onclick={() => deleteCategory(category.id)}
							class="text-xs font-medium text-slate-400 hover:text-red-600 rounded-lg px-1.5 py-0.5 hover:bg-red-50 transition-colors duration-150 whitespace-nowrap"
						>
							Delete
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
