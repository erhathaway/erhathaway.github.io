<script lang="ts">
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

	export type AttributeDraft = {
		id?: number;
		name: string;
		value: string;
		showInNav: boolean;
		isPublished: boolean;
	};

	export type ProjectEditorPayload = {
		name: string;
		displayName: string;
		description: string;
		isPublished: boolean;
		categoryIds: number[];
		attributes: AttributeDraft[];
	};

	type Props = {
		project: Project;
		categories: Category[];
		categoriesLoaded?: boolean;
		categoryIds: number[];
		attributes: AttributeDraft[];
		onSave: (payload: ProjectEditorPayload) => void | Promise<void>;
		onCancel?: () => void;
	};

	let {
		project,
		categories,
		categoriesLoaded = true,
		categoryIds,
		attributes,
		onSave,
		onCancel
	} = $props<Props>();

	let editIsPublished = $state(project.isPublished);
	let editCategoryIds = $state([...categoryIds]);
	let editAttributes = $state(attributes.map((attribute) => ({ ...attribute })));

	let showAttributeModal = $state(false);
	let editingAttributeIndex = $state<number | null>(null);
	let modalAttributeName = $state('');
	let modalAttributeValue = $state('');
	let modalAttributeShowInNav = $state(false);
	let modalAttributeIsPublished = $state(false);

	let showLinkCategoryModal = $state(false);
	let focusedCategoryId = $state<number | null>(null);

	let prevIsPublished = editIsPublished;
	let prevCategoryIds = JSON.stringify(editCategoryIds);
	let prevAttributes = JSON.stringify(editAttributes);

	function toggleCategory(ids: number[], categoryId: number) {
		if (ids.includes(categoryId)) {
			return ids.filter((id) => id !== categoryId);
		}
		return [...ids, categoryId];
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

	function openNewAttributeModal() {
		editingAttributeIndex = null;
		modalAttributeName = '';
		modalAttributeValue = '';
		modalAttributeShowInNav = false;
		modalAttributeIsPublished = false;
		showAttributeModal = true;
	}

	function openEditAttributeModal(index: number) {
		const attribute = editAttributes[index];
		if (!attribute) return;
		editingAttributeIndex = index;
		modalAttributeName = attribute.name;
		modalAttributeValue = attribute.value;
		modalAttributeShowInNav = attribute.showInNav;
		modalAttributeIsPublished = attribute.isPublished;
		showAttributeModal = true;
	}

	function closeAttributeModal() {
		showAttributeModal = false;
		editingAttributeIndex = null;
		modalAttributeName = '';
		modalAttributeValue = '';
		modalAttributeShowInNav = false;
		modalAttributeIsPublished = false;
		saveImmediately();
	}

	function saveAttributeModal() {
		if (!modalAttributeName.trim() || !modalAttributeValue.trim()) return;

		if (editingAttributeIndex !== null) {
			// Edit existing
			editAttributes = updateAttributeRow(editAttributes, editingAttributeIndex, {
				name: modalAttributeName,
				value: modalAttributeValue,
				showInNav: modalAttributeShowInNav,
				isPublished: modalAttributeIsPublished
			});
		} else {
			// Add new
			editAttributes = [
				...editAttributes,
				{
					name: modalAttributeName,
					value: modalAttributeValue,
					showInNav: modalAttributeShowInNav,
					isPublished: modalAttributeIsPublished
				}
			];
		}
		closeAttributeModal();
	}

	function openLinkCategoryModal(categoryId?: number) {
		focusedCategoryId = categoryId ?? null;
		showLinkCategoryModal = true;
	}

	function closeLinkCategoryModal() {
		showLinkCategoryModal = false;
		focusedCategoryId = null;
		saveImmediately();
	}

	function unlinkFocusedCategory() {
		if (focusedCategoryId !== null) {
			editCategoryIds = editCategoryIds.filter((id) => id !== focusedCategoryId);
		}
		closeLinkCategoryModal();
	}

	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let hasUnsavedChanges = $state(false);
	let isSaving = $state(false);

	// Log when isSaving changes
	$effect(() => {
		console.log('isSaving changed to:', isSaving);
	});

	let saveStartTime = 0;

	function triggerAutoSave() {
		console.log('triggerAutoSave called');
		hasUnsavedChanges = true;

		// Show spinner immediately
		if (!isSaving) {
			isSaving = true;
			saveStartTime = Date.now();
		}

		if (saveTimeout) {
			console.log('Clearing existing timeout');
			clearTimeout(saveTimeout);
		}
		console.log('Setting 3-second timeout for save');
		saveTimeout = setTimeout(async () => {
			console.log('Timeout fired, saving now...');
			try {
				await onSave({
					name: project.name,
					displayName: project.displayName,
					description: project.description ?? '',
					isPublished: editIsPublished,
					categoryIds: editCategoryIds,
					attributes: editAttributes
				});
				console.log('Save completed');

				// Ensure spinner shows for at least 500ms from when it first appeared
				const elapsed = Date.now() - saveStartTime;
				if (elapsed < 500) {
					await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
				}
			} finally {
				isSaving = false;
				hasUnsavedChanges = false;
			}
		}, 3000);
	}

	async function saveImmediately() {
		console.log('saveImmediately called, hasUnsavedChanges:', hasUnsavedChanges);
		if (saveTimeout) clearTimeout(saveTimeout);
		if (hasUnsavedChanges) {
			isSaving = true;
			const startTime = Date.now();
			try {
				await onSave({
					name: project.name,
					displayName: project.displayName,
					description: project.description ?? '',
					isPublished: editIsPublished,
					categoryIds: editCategoryIds,
					attributes: editAttributes
				});
				console.log('Immediate save completed');

				// Ensure spinner shows for at least 500ms
				const elapsed = Date.now() - startTime;
				if (elapsed < 500) {
					await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
				}
			} finally {
				isSaving = false;
				hasUnsavedChanges = false;
			}
		}
	}

	// Watch for changes and trigger auto-save
	$effect(() => {
		const currentIsPublished = editIsPublished;
		const currentCategoryIds = JSON.stringify(editCategoryIds);
		const currentAttributes = JSON.stringify(editAttributes);

		// Check if anything actually changed
		const isPublishedChanged = currentIsPublished !== prevIsPublished;
		const categoryIdsChanged = currentCategoryIds !== prevCategoryIds;
		const attributesChanged = currentAttributes !== prevAttributes;

		if (isPublishedChanged || categoryIdsChanged || attributesChanged) {
			console.log('Change detected!', {
				isPublishedChanged,
				categoryIdsChanged,
				attributesChanged,
				currentIsPublished,
				prevIsPublished
			});

			// Update prev values
			prevIsPublished = currentIsPublished;
			prevCategoryIds = currentCategoryIds;
			prevAttributes = currentAttributes;

			// Trigger auto-save
			triggerAutoSave();
		}
	});
</script>

<div class="relative flex flex-col gap-6 flex-1 min-w-[240px]">
	{#if isSaving}
		<div class="absolute top-0 right-0 flex items-center gap-2">
			<span class="text-xs text-slate-400 font-medium">Saving</span>
			<div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"></div>
		</div>
	{/if}

	<!-- Categories -->
	<div>
		<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Categories</p>
		<div class="flex flex-wrap gap-2">
			{#if !categoriesLoaded}
				<p class="text-sm text-slate-400">Loading categories...</p>
			{:else}
				{#if categories.length > 0}
					<button
						type="button"
						onclick={() => openLinkCategoryModal()}
						class="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all duration-150"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
						</svg>
						Link
					</button>
				{/if}

				{#each categories.filter((c) => editCategoryIds.includes(c.id)) as category (category.id)}
					<button
						type="button"
						onclick={() => openLinkCategoryModal(category.id)}
						class="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-3.5 py-1.5 text-xs font-medium hover:bg-slate-800 transition-colors duration-150"
					>
						{category.displayName}
						<span class={`inline-block h-1.5 w-1.5 rounded-full ${category.isPublished ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
					</button>
				{/each}

				{#if categories.length === 0}
					<p class="text-sm text-slate-400">Create a category to start tagging projects.</p>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Attributes -->
	<div>
		<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Attributes</p>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				onclick={openNewAttributeModal}
				class="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all duration-150"
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Add attribute
			</button>

			{#each editAttributes as attribute, index (attribute.id ?? index)}
				<button
					type="button"
					ondblclick={() => openEditAttributeModal(index)}
					class="inline-flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all duration-150 group"
				>
					<span class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border-r border-slate-200 group-hover:bg-slate-100 transition-colors duration-150">
						{attribute.name}
					</span>
					<span class="px-3 py-1.5 text-xs text-slate-500">
						{attribute.value}
					</span>
					<span class="flex items-center gap-1.5 pr-2.5">
						{#if attribute.showInNav}
							<span class="h-1.5 w-1.5 rounded-full bg-blue-400" title="Shown in nav"></span>
						{/if}
						<span
							class={`h-1.5 w-1.5 rounded-full ${attribute.isPublished ? 'bg-emerald-400' : 'bg-slate-300'}`}
							title={attribute.isPublished ? 'Published' : 'Draft'}
						></span>
					</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Published toggle -->
	<div class="flex items-center gap-3">
		<button
			type="button"
			role="switch"
			aria-checked={editIsPublished}
			aria-label="Toggle published"
			onclick={() => {
				editIsPublished = !editIsPublished;
				console.log('Toggle changed!', 'new value:', editIsPublished);
			}}
			class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 ${editIsPublished ? 'bg-emerald-500' : 'bg-slate-200'}`}
		>
			<span
				class={`pointer-events-none inline-block h-5 w-5 translate-y-[1px] transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${editIsPublished ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}
			></span>
		</button>
		<span class="text-sm font-medium text-slate-600">{editIsPublished ? 'Published' : 'Draft'}</span>
	</div>
</div>

<!-- Attribute Modal -->
{#if showAttributeModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			onclick={closeAttributeModal}
			aria-label="Close attribute modal"
		></button>
		<div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
				<h3 class="text-base font-semibold text-slate-900">
					{editingAttributeIndex !== null ? 'Edit Attribute' : 'New Attribute'}
				</h3>
				<button
					type="button"
					class="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					onclick={closeAttributeModal}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Body -->
			<div class="px-6 py-5 grid gap-4">
				<label class="grid gap-1.5">
					<span class="text-xs font-medium text-slate-600">Name</span>
					<input
						type="text"
						bind:value={modalAttributeName}
						class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
						placeholder="e.g., Material, Size, Time"
					/>
				</label>
				<label class="grid gap-1.5">
					<span class="text-xs font-medium text-slate-600">Value</span>
					<input
						type="text"
						bind:value={modalAttributeValue}
						class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
						placeholder="e.g., Black Walnut, 8' &times; 42&quot;, 2 hours"
					/>
				</label>

				<div class="flex flex-col gap-3 pt-1">
					<div class="flex items-center gap-3">
						<button
							type="button"
							role="switch"
							aria-checked={modalAttributeShowInNav}
							aria-label="Toggle show in navigation"
							onclick={() => { modalAttributeShowInNav = !modalAttributeShowInNav; }}
							class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${modalAttributeShowInNav ? 'bg-blue-500' : 'bg-slate-200'}`}
						>
							<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${modalAttributeShowInNav ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
						</button>
						<span class="text-sm text-slate-600">Show in navigation</span>
					</div>
					<div class="flex items-center gap-3">
						<button
							type="button"
							role="switch"
							aria-checked={modalAttributeIsPublished}
							aria-label="Toggle published"
							onclick={() => { modalAttributeIsPublished = !modalAttributeIsPublished; }}
							class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${modalAttributeIsPublished ? 'bg-emerald-500' : 'bg-slate-200'}`}
						>
							<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${modalAttributeIsPublished ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
						</button>
						<span class="text-sm text-slate-600">Published</span>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex items-center gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
				<button
					type="button"
					onclick={saveAttributeModal}
					class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
				>
					{editingAttributeIndex !== null ? 'Save changes' : 'Add attribute'}
				</button>
				{#if editingAttributeIndex !== null}
					<button
						type="button"
						onclick={() => {
							if (editingAttributeIndex !== null) {
								editAttributes = removeAttributeRow(editAttributes, editingAttributeIndex);
							}
							closeAttributeModal();
						}}
						class="px-4 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-150"
					>
						Delete
					</button>
				{/if}
				<button
					type="button"
					class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					onclick={closeAttributeModal}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Link Category Modal -->
{#if showLinkCategoryModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			onclick={closeLinkCategoryModal}
			aria-label="Close link category modal"
		></button>
		<div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
				<h3 class="text-base font-semibold text-slate-900">Link Categories</h3>
				<button
					type="button"
					class="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					onclick={closeLinkCategoryModal}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Body -->
			<div class="px-6 py-4 grid gap-2 max-h-96 overflow-y-auto">
				{#each categories as category (category.id)}
					{@const isSelected = editCategoryIds.includes(category.id)}
					{@const isFocused = focusedCategoryId === category.id}
					<button
						type="button"
						onclick={() => (editCategoryIds = toggleCategory(editCategoryIds, category.id))}
						class={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
							isFocused
								? 'bg-slate-100 border-slate-900 ring-1 ring-slate-900'
								: isSelected
									? 'bg-slate-50 border-slate-300'
									: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
						}`}
					>
						<div class="flex-1">
							<p class={`text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
								{category.displayName}
							</p>
							<p class="text-xs text-slate-400 font-mono">/{category.name}</p>
						</div>
						<div class="flex items-center gap-2.5">
							<span class={`inline-block h-2 w-2 rounded-full ${category.isPublished ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
							{#if isSelected}
								<svg
									class="w-5 h-5 text-slate-900"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							{/if}
						</div>
					</button>
				{/each}
			</div>

			<!-- Footer -->
			<div class="flex items-center gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
				{#if focusedCategoryId !== null}
					<button
						type="button"
						onclick={unlinkFocusedCategory}
						class="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors duration-150"
					>
						Unlink category
					</button>
				{/if}
				<button
					type="button"
					onclick={closeLinkCategoryModal}
					class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}
