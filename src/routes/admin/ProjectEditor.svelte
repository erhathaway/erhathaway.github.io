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

	let editName = $state(project.name);
	let editDisplayName = $state(project.displayName);
	let editDescription = $state(project.description ?? '');
	let editIsPublished = $state(project.isPublished);
	let editCategoryIds = $state<number[]>([...categoryIds]);
	let editAttributes = $state<AttributeDraft[]>(attributes.map((attribute) => ({ ...attribute })));

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

	function handleSave() {
		void onSave({
			name: editName.trim(),
			displayName: editDisplayName.trim(),
			description: editDescription.trim(),
			isPublished: editIsPublished,
			categoryIds: editCategoryIds,
			attributes: editAttributes
		});
	}
</script>

<div class="flex flex-col gap-3 flex-1 min-w-[240px]">
	<div class="flex flex-wrap gap-3">
		<input
			bind:value={editName}
			class="w-40 rounded-md border border-walnut/20 px-3 py-2 text-sm"
		/>
		<input
			bind:value={editDisplayName}
			class="w-56 rounded-md border border-walnut/20 px-3 py-2 text-sm"
			placeholder={editName}
		/>
	</div>
	<textarea
		bind:value={editDescription}
		rows="3"
		class="w-full rounded-md border border-walnut/20 px-3 py-2 text-sm"
	></textarea>
	<div>
		<p class="text-sm text-ash">Categories</p>
		{#if !categoriesLoaded}
			<p class="mt-2 text-xs text-ash">Loading categories...</p>
		{:else if categories.length === 0}
			<p class="mt-2 text-xs text-ash">Create a category to start tagging projects.</p>
		{:else}
			<div class="mt-2 flex flex-wrap gap-2">
				{#each categories as category (category.id)}
					{@const isSelected = editCategoryIds.includes(category.id)}
					<button
						type="button"
						onclick={() => (editCategoryIds = toggleCategory(editCategoryIds, category.id))}
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
		<div class="flex items-center justify-between">
			<p class="text-sm text-ash">Attributes</p>
			<button
				type="button"
				onclick={() => (editAttributes = addAttributeRow(editAttributes))}
				class="text-xs text-copper hover:text-walnut"
			>
				Add attribute
			</button>
		</div>
		{#if editAttributes.length === 0}
			<p class="mt-2 text-xs text-ash">No attributes yet.</p>
		{:else}
			<div class="mt-2 grid gap-2">
				{#each editAttributes as attribute, index (attribute.id ?? index)}
					<div class="flex flex-wrap items-center gap-2 rounded-lg border border-walnut/10 bg-cream/60 p-2">
						<input
							class="flex-1 min-w-[160px] rounded-md border border-walnut/20 px-3 py-2 text-xs"
							placeholder="Name"
							value={attribute.name}
							oninput={(event) =>
								(editAttributes = updateAttributeRow(editAttributes, index, {
									name: (event.target as HTMLInputElement).value
								}))}
						/>
						<input
							class="flex-1 min-w-[200px] rounded-md border border-walnut/20 px-3 py-2 text-xs"
							placeholder="Value"
							value={attribute.value}
							oninput={(event) =>
								(editAttributes = updateAttributeRow(editAttributes, index, {
									value: (event.target as HTMLInputElement).value
								}))}
						/>
						<label class="flex items-center gap-1 text-[11px] text-ash">
							<input
								type="checkbox"
								checked={attribute.showInNav}
								onchange={(event) =>
									(editAttributes = updateAttributeRow(editAttributes, index, {
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
									(editAttributes = updateAttributeRow(editAttributes, index, {
										isPublished: (event.target as HTMLInputElement).checked
									}))}
								class="accent-copper"
							/>
							Published
						</label>
						<button
							type="button"
							onclick={() => (editAttributes = removeAttributeRow(editAttributes, index))}
							class="text-xs text-red-600 hover:text-red-700"
						>
							Remove
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
	<label class="flex items-center gap-2 text-sm text-ash">
		<input type="checkbox" bind:checked={editIsPublished} class="accent-copper" />
		Published
	</label>
	<div class="flex items-center gap-2">
		<button
			type="button"
			onclick={handleSave}
			class="px-3 py-2 rounded-full bg-walnut text-cream text-sm hover:bg-copper transition-colors"
		>
			Save
		</button>
		{#if onCancel}
			<button
				type="button"
				onclick={onCancel}
				class="px-3 py-2 rounded-full border border-walnut/20 text-sm text-walnut hover:border-copper hover:text-copper transition-colors"
			>
				Cancel
			</button>
		{/if}
	</div>
</div>
