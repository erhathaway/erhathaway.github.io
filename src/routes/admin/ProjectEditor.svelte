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
		onAddCategory?: () => void;
	};

	let {
		project,
		categories,
		categoriesLoaded = true,
		categoryIds,
		attributes,
		onSave,
		onCancel,
		onAddCategory
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

<div class="relative flex flex-col gap-3 flex-1 min-w-[240px]">
	{#if isSaving}
		<div class="absolute top-0 right-0">
			<svg
				class="animate-spin h-5 w-5 text-copper"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		</div>
	{/if}
	<div>
		<p class="text-sm text-ash mb-2">Categories</p>
		<div class="flex flex-wrap gap-2">
			{#if !categoriesLoaded}
				<p class="text-xs text-ash">Loading categories...</p>
			{:else}
				<!-- Add new category button pill -->
				{#if onAddCategory}
					<button
						type="button"
						onclick={onAddCategory}
						class="inline-flex items-center rounded-full border-2 border-dashed border-walnut/30 bg-cream/60 hover:border-copper hover:bg-copper/10 transition-colors"
					>
						<span class="px-3 py-1 text-xs text-copper font-medium">+ Add new category</span>
					</button>
				{/if}

				<!-- Link category button pill -->
				{#if categories.length > 0}
					<button
						type="button"
						onclick={() => openLinkCategoryModal()}
						class="inline-flex items-center rounded-full border-2 border-dashed border-walnut/30 bg-cream/60 hover:border-copper hover:bg-copper/10 transition-colors"
					>
						<span class="px-3 py-1 text-xs text-copper font-medium">Link category</span>
					</button>
				{/if}

				<!-- Selected category pills -->
				{#each categories.filter((c) => editCategoryIds.includes(c.id)) as category (category.id)}
					<button
						type="button"
						onclick={() => openLinkCategoryModal(category.id)}
						class="flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors bg-copper/90 text-cream border-copper ring-2 ring-copper/40 hover:bg-copper"
					>
						<span class="font-semibold">{category.displayName}</span>
						<span
							class={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
								category.isPublished
									? 'bg-emerald-500 text-white'
									: 'bg-cream/20 text-cream/70'
							}`}
						>
							{category.isPublished ? 'Published' : 'Not published'}
						</span>
					</button>
				{/each}

				{#if categories.length === 0 && !onAddCategory}
					<p class="text-xs text-ash">Create a category to start tagging projects.</p>
				{/if}
			{/if}
		</div>
	</div>
	<div>
		<p class="text-sm text-ash mb-2">Attributes</p>
		<div class="flex flex-wrap gap-2">
			<!-- Add attribute button pill -->
			<button
				type="button"
				onclick={openNewAttributeModal}
				class="inline-flex items-center rounded-full border-2 border-dashed border-walnut/30 bg-cream/60 hover:border-copper hover:bg-copper/10 transition-colors"
			>
				<span class="px-3 py-1 text-xs text-copper font-medium">+ Add attribute</span>
			</button>

			<!-- Attribute pills -->
			{#each editAttributes as attribute, index (attribute.id ?? index)}
				<button
					type="button"
					ondblclick={() => openEditAttributeModal(index)}
					class="inline-flex items-center gap-1.5 rounded-full border border-walnut/20 bg-white hover:border-copper transition-colors group"
				>
					<span class="px-3 py-1 text-xs font-medium text-walnut border-r border-walnut/20 group-hover:border-copper">
						{attribute.name}
					</span>
					<span class="pl-1 pr-2 py-1 text-xs text-ash">
						{attribute.value}
					</span>
					{#if attribute.showInNav}
						<span class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-500 text-white">
							In nav
						</span>
					{/if}
					<span
						class={`mr-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
							attribute.isPublished
								? 'bg-emerald-500 text-white'
								: 'bg-ash/20 text-ash'
						}`}
					>
						{attribute.isPublished ? 'Published' : 'Not published'}
					</span>
				</button>
			{/each}
		</div>
	</div>
	<label class="flex items-center gap-2 text-sm text-ash">
		<input
			type="checkbox"
			bind:checked={editIsPublished}
			class="accent-copper"
			onchange={(e) => {
				console.log('Checkbox changed!', 'new value:', (e.target as HTMLInputElement).checked, 'editIsPublished:', editIsPublished);
			}}
		/>
		Published
	</label>
</div>

{#if showAttributeModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			onclick={closeAttributeModal}
			aria-label="Close attribute modal"
		></button>
		<div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
			<div class="flex items-start justify-between gap-4 mb-4">
				<div>
					<p class="text-xs uppercase tracking-[0.25em] text-ash">
						{editingAttributeIndex !== null ? 'Edit' : 'New'} Attribute
					</p>
					<h3 class="font-display text-2xl text-walnut mt-1">
						{editingAttributeIndex !== null ? 'Update details' : 'Add details'}
					</h3>
				</div>
				<button
					type="button"
					class="text-xs uppercase tracking-wide text-ash hover:text-copper"
					onclick={closeAttributeModal}
				>
					Close
				</button>
			</div>

			<div class="grid gap-4">
				<label class="text-sm">
					<span class="text-ash">Name</span>
					<input
						type="text"
						bind:value={modalAttributeName}
						class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
						placeholder="e.g., Material, Size, Time"
					/>
				</label>
				<label class="text-sm">
					<span class="text-ash">Value</span>
					<input
						type="text"
						bind:value={modalAttributeValue}
						class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
						placeholder="e.g., Black Walnut, 8' × 42&quot;, 2 hours"
					/>
				</label>
				<label class="flex items-center gap-2 text-sm text-ash">
					<input type="checkbox" bind:checked={modalAttributeShowInNav} class="accent-copper" />
					Show in navigation
				</label>
				<label class="flex items-center gap-2 text-sm text-ash">
					<input type="checkbox" bind:checked={modalAttributeIsPublished} class="accent-copper" />
					Published
				</label>

				<div class="flex flex-wrap gap-3 pt-2">
					<button
						type="button"
						onclick={saveAttributeModal}
						class="px-4 py-2 rounded-full bg-walnut text-cream text-sm hover:bg-copper transition-colors"
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
							class="px-4 py-2 rounded-full border border-red-200 text-sm text-red-600 hover:bg-red-50"
						>
							Delete
						</button>
					{/if}
					<button
						type="button"
						class="px-4 py-2 rounded-full border border-walnut/20 text-sm text-ash hover:text-walnut"
						onclick={closeAttributeModal}
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showLinkCategoryModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			onclick={closeLinkCategoryModal}
			aria-label="Close link category modal"
		></button>
		<div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
			<div class="flex items-start justify-between gap-4 mb-4">
				<div>
					<p class="text-xs uppercase tracking-[0.25em] text-ash">Link Categories</p>
					<h3 class="font-display text-2xl text-walnut mt-1">Select categories</h3>
				</div>
				<button
					type="button"
					class="text-xs uppercase tracking-wide text-ash hover:text-copper"
					onclick={closeLinkCategoryModal}
				>
					Close
				</button>
			</div>

			<div class="grid gap-3 max-h-96 overflow-y-auto">
				{#each categories as category (category.id)}
					{@const isSelected = editCategoryIds.includes(category.id)}
					{@const isFocused = focusedCategoryId === category.id}
					<button
						type="button"
						onclick={() => (editCategoryIds = toggleCategory(editCategoryIds, category.id))}
						class={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
							isFocused
								? 'bg-walnut/10 border-walnut ring-2 ring-walnut/40'
								: isSelected
									? 'bg-copper/10 border-copper ring-2 ring-copper/40'
									: 'border-walnut/20 hover:border-copper'
						}`}
					>
						<div class="flex-1">
							<p class={`text-sm font-medium ${isFocused ? 'text-walnut' : isSelected ? 'text-copper' : 'text-walnut'}`}>
								{category.displayName}
							</p>
							<p class="text-xs text-ash">/{category.name}</p>
						</div>
						<div class="flex items-center gap-2">
							<span
								class={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${
									category.isPublished
										? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
										: 'bg-ash/10 text-ash border border-ash/20'
								}`}
							>
								{category.isPublished ? 'Live' : 'Draft'}
							</span>
							{#if isSelected}
								<svg
									class="w-5 h-5 text-copper"
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

			<div class="flex flex-wrap gap-3 pt-4 mt-4 border-t border-walnut/10">
				{#if focusedCategoryId !== null}
					<button
						type="button"
						onclick={unlinkFocusedCategory}
						class="px-4 py-2 rounded-full bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
					>
						Unlink category
					</button>
				{/if}
				<button
					type="button"
					onclick={closeLinkCategoryModal}
					class="px-4 py-2 rounded-full bg-walnut text-cream text-sm hover:bg-copper transition-colors"
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}
