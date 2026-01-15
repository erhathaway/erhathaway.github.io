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

	let newName = $state('');
	let newDisplayName = $state('');
	let newIsPublished = $state(false);

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
		setCategories([created, ...categories]);
		newName = '';
		newDisplayName = '';
		newIsPublished = false;
		success = 'Category created.';
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
	<div class="flex flex-wrap items-center justify-between gap-4 mb-6">
		<div>
			<h2 class="font-display text-xl text-walnut">Categories</h2>
			<p class="text-ash text-xs mt-0.5">Manage portfolio categories</p>
		</div>
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={fetchCategories}
				disabled={isLoading}
				class="px-3 py-1.5 text-xs border border-walnut/20 rounded-full hover:bg-walnut/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{isLoading ? 'Refreshing...' : 'Refresh'}
			</button>
			<select
				bind:value={filter}
				class="px-3 py-1.5 pr-8 text-xs border border-walnut/20 rounded-full bg-white appearance-none cursor-pointer hover:bg-walnut/5 focus:outline-none focus:border-walnut/40 relative"
				style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%23888%27%3e%3cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 8px center; background-size: 16px;"
			>
				<option value="all">All</option>
				<option value="published">Published</option>
				<option value="unpublished">Drafts</option>
			</select>
		</div>
	</div>

	<form class="flex flex-wrap items-end gap-3 mb-6 pb-6 border-b border-walnut/5" onsubmit={createCategory}>
		<div class="flex gap-3">
			<input
				bind:value={newName}
				required
				class="w-32 px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white/50 placeholder-ash/50 focus:outline-none focus:border-walnut/30"
				placeholder="url-slug"
			/>
			<input
				bind:value={newDisplayName}
				class="w-40 px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white/50 placeholder-ash/50 focus:outline-none focus:border-walnut/30"
				placeholder="Display Name"
			/>
		</div>
		<label class="flex items-center gap-2 text-xs text-ash cursor-pointer hover:text-walnut">
			<input type="checkbox" bind:checked={newIsPublished} class="w-3.5 h-3.5 rounded border-walnut/30 text-copper focus:ring-0 focus:ring-offset-0" />
			Publish
		</label>
		<button
			type="submit"
			class="px-4 py-1.5 text-xs bg-[#F5F1EB] text-walnut border border-walnut/20 rounded-full hover:bg-walnut hover:text-cream hover:border-walnut transition-colors"
		>
			Add Category
		</button>
	</form>

	{#if error}
		<p class="text-xs text-red-600 mb-3">{error}</p>
	{/if}
	{#if success}
		<p class="text-xs text-emerald-600 mb-3">{success}</p>
	{/if}

	{#if isLoading}
		<p class="text-xs text-ash">Loading...</p>
	{:else if filteredCategories.length === 0}
		<p class="text-xs text-ash">No categories yet</p>
	{:else if editingId !== null}
		{#each filteredCategories as category (category.id)}
			{#if editingId === category.id}
				<div class="flex flex-wrap items-center gap-3 p-4 bg-white/70 rounded-xl border border-walnut/15">
					<input
						bind:value={editName}
						class="w-32 px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white focus:outline-none focus:border-walnut/30"
						placeholder="url-slug"
					/>
					<input
						bind:value={editDisplayName}
						class="w-40 px-3 py-2 text-sm rounded-lg border border-walnut/15 bg-white focus:outline-none focus:border-walnut/30"
						placeholder="Display Name"
					/>
					<label class="flex items-center gap-2 text-xs text-ash cursor-pointer hover:text-walnut">
						<input type="checkbox" bind:checked={editIsPublished} class="w-3.5 h-3.5 rounded border-walnut/30 text-copper focus:ring-0 focus:ring-offset-0" />
						Publish
					</label>
					<div class="flex items-center gap-2 ml-auto">
						<button
							type="button"
							onclick={saveEdit}
							class="px-4 py-1.5 text-xs bg-walnut text-cream rounded-full hover:bg-copper transition-colors"
						>
							Save
						</button>
						<button
							type="button"
							onclick={cancelEdit}
							class="px-3 py-1.5 text-xs text-walnut border border-walnut/20 rounded-full hover:bg-walnut/5 transition-colors"
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
				<div class="group inline-flex items-center gap-2 px-4 py-2 bg-[#E8E4DE] border border-walnut/15 rounded-full hover:border-walnut/25 hover:bg-[#DDD9D3] hover:pr-3 transition-all">
					<span class="text-sm text-walnut font-medium">{category.displayName || category.name}</span>
					<span class="text-xs text-ash">/{category.name}</span>
					{#if category.isPublished}
						<span class="w-1.5 h-1.5 bg-copper rounded-full flex-shrink-0"></span>
					{:else}
						<span class="text-xs text-ash/60">(draft)</span>
					{/if}

					<div class="flex items-center gap-0.5 overflow-hidden max-w-0 group-hover:max-w-[150px] transition-all duration-300">
						<span class="text-ash/20 mx-1">|</span>
						<button
							type="button"
							onclick={() => startEdit(category)}
							class="text-xs text-ash hover:text-walnut hover:bg-blue-100 rounded px-2 py-0.5 transition-colors whitespace-nowrap"
						>
							Edit
						</button>
						<button
							type="button"
							onclick={() => deleteCategory(category.id)}
							class="text-xs text-red-600/70 hover:text-red-600 hover:bg-red-50 rounded px-2 py-0.5 transition-colors whitespace-nowrap"
						>
							Delete
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>
