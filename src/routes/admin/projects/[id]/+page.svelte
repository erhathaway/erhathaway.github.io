<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { SignedIn, SignedOut, UserButton, useClerkContext } from 'svelte-clerk';
	import ProjectEditor, { type AttributeDraft, type ProjectEditorPayload } from '../../ProjectEditor.svelte';
	import ImageArtifactEditor from '$lib/schemas/artifacts/image-v1/Editor.svelte';
	import ImageArtifactAdminList from '$lib/schemas/artifacts/image-v1/AdminList.svelte';
	import { artifactSchemas, validateArtifactData } from '$lib/schemas/artifacts';
	import { createImageV1Draft, type ImageV1Data } from '$lib/schemas/artifacts/image-v1/validator';

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

	type ProjectArtifact = {
		id: number;
		projectId: number;
		schema: string;
		dataBlob: unknown;
		isPublished: boolean;
	};

	type PageProps = {
		data: {
			projectId: string;
		};
	};

	let { data }: PageProps = $props();
	const projectId = $derived(Number(data.projectId));

	const ctx = useClerkContext();

	let project = $state<Project | null>(null);
	let categories = $state<Category[]>([]);
	let categoriesLoaded = $state(false);
	let categoryIds = $state<number[]>([]);
	let attributes = $state<ProjectAttribute[]>([]);
	let artifacts = $state<ProjectArtifact[]>([]);

	let pageLoading = $state(false);
	let pageError = $state('');
	let pageSuccess = $state('');

	const initialSchema = artifactSchemas[0]?.name ?? 'image-v1';
	const initialDraft = createImageV1Draft();
	const initialValidation = validateArtifactData(initialSchema, initialDraft);
	let artifactSchema = $state(initialSchema);
	let artifactDraft = $state<ImageV1Data>(initialDraft);
	let artifactDraftErrors = $state<string[]>(initialValidation.ok ? [] : initialValidation.errors);
	let artifactIsPublished = $state(false);
	let showCreateArtifactModal = $state(false);
	let artifactUploadState = $state<{ uploading: boolean; error: string | null }>({
		uploading: false,
		error: null
	});
	let editingArtifactId = $state<number | null>(null);
	let showEditArtifactModal = $state(false);
	let editArtifactDraft = $state<ImageV1Data>(createImageV1Draft());
	let editArtifactErrors = $state<string[]>([]);
	let editArtifactIsPublished = $state(false);
	let editArtifactUploadState = $state<{ uploading: boolean; error: string | null }>({
		uploading: false,
		error: null
	});

	let editingField = $state<'name' | 'displayName' | 'description' | null>(null);
	let editName = $state('');
	let editDisplayName = $state('');
	let editDescription = $state('');

	let nameInput: HTMLInputElement | undefined = $state();
	let displayNameInput: HTMLInputElement | undefined = $state();
	let descriptionInput: HTMLTextAreaElement | undefined = $state();

	let isSavingBasicInfo = $state(false);

	function handleSchemaChange(event: Event) {
		const target = event.currentTarget as HTMLSelectElement | null;
		const nextSchema = target?.value ?? '';
		artifactSchema = nextSchema;
		artifactUploadState = { uploading: false, error: null };
		if (nextSchema !== 'image-v1') {
			return;
		}
		const nextDraft = createImageV1Draft();
		artifactDraft = nextDraft;
		const validation = validateArtifactData(nextSchema, nextDraft);
		artifactDraftErrors = validation.ok ? [] : validation.errors;
	}

	async function getToken() {
		const clerk = ctx.clerk;
		const session = clerk?.session;
		if (!session) return null;
		return session.getToken();
	}

	async function fetchProject(id = projectId) {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch(`/api/projects/${id}`, { headers });
		if (!response.ok) {
			throw new Error('Failed to load project');
		}
		project = await response.json();
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
		categories = await response.json();
		categoriesLoaded = true;
	}

	async function fetchProjectCategories(id = projectId) {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch(`/api/projects/${id}/categories`, { headers });
		if (!response.ok) {
			throw new Error('Failed to load project categories');
		}
		const rows = (await response.json()) as Category[];
		categoryIds = rows.map((row) => row.id);
	}

	async function fetchProjectAttributes(id = projectId) {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch(`/api/projects/${id}/attributes`, { headers });
		if (!response.ok) {
			throw new Error('Failed to load project attributes');
		}
		attributes = await response.json();
	}

	async function fetchProjectArtifacts(id = projectId) {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch(`/api/projects/${id}/artifacts`, { headers });
		if (!response.ok) {
			throw new Error('Failed to load project artifacts');
		}
		artifacts = await response.json();
	}

	async function loadAllFor(id: number) {
		pageError = '';
		pageSuccess = '';
		pageLoading = true;
		try {
			await Promise.all([
				fetchProject(id),
				fetchCategories(),
				fetchProjectCategories(id),
				fetchProjectAttributes(id),
				fetchProjectArtifacts(id)
			]);
		} catch (err) {
			console.error(err);
			pageError = err instanceof Error ? err.message : 'Unable to load project.';
		} finally {
			pageLoading = false;
		}
	}


	function sanitizeAttributes(input: AttributeDraft[]) {
		const cleaned: AttributeDraft[] = [];
		for (const attribute of input) {
			const name = attribute.name.trim();
			const value = attribute.value.trim();
			if (!name && !value) {
				continue;
			}
			if (!name || !value) {
				pageError = 'Attributes need both a name and a value.';
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

	async function updateProjectCategories(desiredIds: number[]) {
		const token = await getToken();
		if (!token) {
			pageError = 'Sign in to update project categories.';
			return;
		}

		const current = categoryIds;
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
				pageError = 'Unable to add project categories.';
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
				pageError = 'Unable to remove project categories.';
				return;
			}
		}

		categoryIds = [...desiredIds];
	}

	async function updateProjectAttributes(nextAttributes: AttributeDraft[]) {
		const token = await getToken();
		if (!token) {
			pageError = 'Sign in to update project attributes.';
			return;
		}

		const cleaned = sanitizeAttributes(nextAttributes);
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
			pageError = 'Unable to update project attributes.';
			return;
		}
		attributes = await response.json();
	}

	async function handleSave(payload: ProjectEditorPayload) {
		pageError = '';
		pageSuccess = '';
		const token = await getToken();
		if (!token) {
			pageError = 'Sign in to update projects.';
			return;
		}

		const response = await fetch(`/api/projects/${projectId}`, {
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
			pageError = 'Unable to update project.';
			return;
		}

		project = await response.json();
		await updateProjectCategories(payload.categoryIds);
		await updateProjectAttributes(payload.attributes);
		pageSuccess = 'Project updated.';
	}

	async function createArtifact(event: Event) {
		event.preventDefault();
		pageError = '';
		pageSuccess = '';

		if (artifactUploadState.uploading) {
			pageError = 'Wait for the image upload to finish.';
			return;
		}

		const token = await getToken();
		if (!token) {
			pageError = 'Sign in to create artifacts.';
			return;
		}

		const schema = artifactSchema.trim();
		if (!schema) {
			pageError = 'Schema is required.';
			return;
		}

		const validation = validateArtifactData(schema, artifactDraft);
		if (!validation.ok) {
			pageError = validation.errors.join('; ');
			return;
		}

		const response = await fetch(`/api/projects/${projectId}/artifacts`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				schema,
				dataBlob: validation.value,
				isPublished: artifactIsPublished
			})
		});

		if (!response.ok) {
			pageError = 'Unable to create artifact.';
			return;
		}

		const created = await response.json();
		artifacts = [created, ...artifacts];
		artifactSchema = schema;
		artifactDraft = createImageV1Draft();
		artifactDraftErrors = [];
		artifactIsPublished = false;
		showCreateArtifactModal = false;
		pageSuccess = 'Artifact created.';
	}

	function handleArtifactDraftChange(next: ImageV1Data) {
		artifactDraft = next;
		const validation = validateArtifactData(artifactSchema, next);
		artifactDraftErrors = validation.ok ? [] : validation.errors;
	}

	function handleArtifactUploadStateChange(state: { uploading: boolean; error: string | null }) {
		artifactUploadState = state;
	}

	async function handleArtifactUpload(file: File) {
		const token = await getToken();
		if (!token) {
			throw new Error('Sign in to upload images.');
		}

		const formData = new FormData();
		formData.append('file', file);
		const response = await fetch('/api/uploads/artifacts', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`
			},
			body: formData
		});

		if (!response.ok) {
			throw new Error('Upload failed.');
		}

		const payload = (await response.json()) as { url?: string };
		if (!payload.url) {
			throw new Error('Upload response missing url.');
		}

		return payload.url;
	}

	function startArtifactEdit(artifact: ProjectArtifact) {
		if (artifact.schema !== 'image-v1') {
			pageError = 'Unsupported schema for editing.';
			return;
		}
		const validation = validateArtifactData(artifact.schema, artifact.dataBlob);
		editingArtifactId = artifact.id;
		editArtifactDraft = validation.ok ? (validation.value as ImageV1Data) : createImageV1Draft();
		editArtifactErrors = validation.ok ? [] : validation.errors;
		editArtifactIsPublished = artifact.isPublished;
		editArtifactUploadState = { uploading: false, error: null };
		showEditArtifactModal = true;
	}

	function cancelArtifactEdit() {
		editingArtifactId = null;
		editArtifactDraft = createImageV1Draft();
		editArtifactErrors = [];
		editArtifactIsPublished = false;
		editArtifactUploadState = { uploading: false, error: null };
		showEditArtifactModal = false;
	}

	function handleEditArtifactDraftChange(next: ImageV1Data) {
		editArtifactDraft = next;
		const validation = validateArtifactData('image-v1', next);
		editArtifactErrors = validation.ok ? [] : validation.errors;
	}

	function handleEditArtifactUploadStateChange(state: { uploading: boolean; error: string | null }) {
		editArtifactUploadState = state;
	}

	async function saveArtifactEdit() {
		if (editingArtifactId === null) return;
		if (editArtifactUploadState.uploading) {
			pageError = 'Wait for the image upload to finish.';
			return;
		}
		const validation = validateArtifactData('image-v1', editArtifactDraft);
		if (!validation.ok) {
			editArtifactErrors = validation.errors;
			return;
		}
		const token = await getToken();
		if (!token) {
			pageError = 'Sign in to update artifacts.';
			return;
		}
		const response = await fetch(`/api/projects/${projectId}/artifacts/${editingArtifactId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				schema: 'image-v1',
				dataBlob: validation.value,
				isPublished: editArtifactIsPublished
			})
		});
		if (!response.ok) {
			pageError = 'Unable to update artifact.';
			return;
		}
		const updated = await response.json();
		artifacts = artifacts.map((artifact) => (artifact.id === updated.id ? updated : artifact));
		cancelArtifactEdit();
		pageSuccess = 'Artifact updated.';
	}

	async function deleteArtifact(artifactId: number) {
		if (!confirm('Delete this artifact?')) return;
		const token = await getToken();
		if (!token) {
			pageError = 'Sign in to delete artifacts.';
			return;
		}
		const response = await fetch(`/api/projects/${projectId}/artifacts/${artifactId}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`
			}
		});
		if (!response.ok) {
			pageError = 'Unable to delete artifact.';
			return;
		}
		artifacts = artifacts.filter((artifact) => artifact.id !== artifactId);
		if (editingArtifactId === artifactId) {
			cancelArtifactEdit();
		}
		pageSuccess = 'Artifact deleted.';
	}

	async function updateProjectBasicInfo() {
		pageError = '';
		pageSuccess = '';
		isSavingBasicInfo = true;
		const startTime = Date.now();

		try {
			const token = await getToken();
			if (!token) {
				pageError = 'Sign in to update projects.';
				return;
			}

			const response = await fetch(`/api/projects/${projectId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					name: editName.trim(),
					displayName: editDisplayName.trim() || editName.trim(),
					description: editDescription.trim() || null,
					isPublished: project?.isPublished ?? false
				})
			});

			if (!response.ok) {
				pageError = 'Unable to update project.';
				return;
			}

			project = await response.json();
			editingField = null;
			pageSuccess = 'Project updated.';

			// Ensure spinner shows for at least 500ms
			const elapsed = Date.now() - startTime;
			if (elapsed < 500) {
				await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
			}
		} finally {
			isSavingBasicInfo = false;
		}
	}

	onMount(() => {
		let currentId = Number.isNaN(projectId) ? null : projectId;
		if (currentId !== null) {
			void loadAllFor(currentId);
		}
		const unsubscribe = page.subscribe(($page) => {
			const nextId = Number($page.params?.id ?? data.projectId);
			if (!Number.isNaN(nextId) && nextId !== currentId) {
				currentId = nextId;
				void loadAllFor(nextId);
			}
		});
		return () => {
			unsubscribe();
		};
	});

	$effect(() => {
		if (project) {
			editName = project.name;
			editDisplayName = project.displayName;
			editDescription = project.description ?? '';
		}
	});

	function handleClickOutside(event: MouseEvent) {
		if (editingField && event.target instanceof HTMLElement) {
			const target = event.target;
			const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
			if (!isInput) {
				void updateProjectBasicInfo();
			}
		}
	}

	$effect(() => {
		if (editingField) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});

	$effect(() => {
		if (editingField === 'name' && nameInput) {
			nameInput.focus();
			nameInput.select();
		} else if (editingField === 'displayName' && displayNameInput) {
			displayNameInput.focus();
			displayNameInput.select();
		} else if (editingField === 'description' && descriptionInput) {
			descriptionInput.focus();
			descriptionInput.select();
		}
	});
</script>

<header class="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-walnut/10">
	<div>
		<p class="text-xs uppercase tracking-[0.25em] text-ash">Project editor</p>
		<h1 class="font-display text-3xl text-walnut mt-2">Manage project</h1>
	</div>
	<UserButton />
</header>

<SignedIn>
	{#if pageLoading}
		<p class="text-ash text-sm">Loading project...</p>
	{:else if project}
		<section class="relative rounded-2xl border border-walnut/10 bg-white/70 p-6 shadow-sm">
			{#if isSavingBasicInfo}
				<div class="absolute top-0 right-0 m-2">
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
			<div class="flex items-start justify-between gap-4 mb-6">
				<div class="flex-1">
					<div class="flex items-baseline gap-2">
						{#if editingField === 'displayName'}
							<input
								bind:this={displayNameInput}
								bind:value={editDisplayName}
								class="flex-1 rounded-md border border-walnut/20 px-3 py-2 font-display text-2xl"
								onblur={() => {
									void updateProjectBasicInfo();
								}}
								onkeydown={(event) => {
									if (event.key === 'Enter') {
										void updateProjectBasicInfo();
									}
									if (event.key === 'Escape') {
										editDisplayName = project?.displayName ?? '';
										editingField = null;
									}
								}}
							/>
						{:else}
							<h2
								class="font-display text-2xl text-walnut cursor-pointer hover:text-copper"
								ondblclick={() => (editingField = 'displayName')}
								role="button"
								tabindex="0"
							>
								{project.displayName}
							</h2>
						{/if}
						{#if editingField === 'name'}
							<input
								bind:this={nameInput}
								bind:value={editName}
								class="rounded-md border border-walnut/20 px-2 py-1 text-xs"
								onblur={() => {
									void updateProjectBasicInfo();
								}}
								onkeydown={(event) => {
									if (event.key === 'Enter') {
										void updateProjectBasicInfo();
									}
									if (event.key === 'Escape') {
										editName = project?.name ?? '';
										editingField = null;
									}
								}}
							/>
						{:else}
							<p
								class="text-xs text-ash cursor-pointer hover:text-copper"
								ondblclick={() => (editingField = 'name')}
								role="button"
								tabindex="0"
							>
								/{project.name}
							</p>
						{/if}
					</div>
					{#if editingField === 'description'}
						<textarea
							bind:this={descriptionInput}
							bind:value={editDescription}
							rows="2"
							class="w-full mt-2 rounded-md border border-walnut/20 px-3 py-2 text-sm"
							onblur={() => {
								void updateProjectBasicInfo();
							}}
							onkeydown={(event) => {
								if (event.key === 'Escape') {
									editDescription = project?.description ?? '';
									editingField = null;
								}
							}}
						></textarea>
					{:else}
						<p
							class={`text-sm mt-2 cursor-pointer hover:text-copper ${
								project.description ? 'text-ash' : 'text-ash opacity-50 italic'
							}`}
							ondblclick={() => (editingField = 'description')}
							role="button"
							tabindex="0"
						>
							{project.description || '<no description>'}
						</p>
					{/if}
				</div>
			</div>

			{#key project.id}
				<ProjectEditor
					project={project}
					{categories}
					{categoriesLoaded}
					{categoryIds}
					attributes={attributes}
					onSave={handleSave}
					onAddCategory={() => {
						window.location.href = '/admin#categories';
					}}
				/>
			{/key}
		</section>

		<section class="mt-8 rounded-2xl border border-walnut/10 bg-white/70 p-6 shadow-sm">
			<div class="flex items-center justify-between gap-4 mb-6">
				<div>
					<h2 class="font-display text-2xl text-walnut">Artifacts</h2>
					<p class="text-ash text-sm">Versioned data snapshots for the project.</p>
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				<div class="rounded-2xl border border-dashed border-walnut/30 bg-cream/60 p-4 flex flex-col gap-4">
					<p class="text-xs uppercase tracking-[0.25em] text-ash">New Artifact</p>
					<label class="text-sm">
						<span class="text-ash">Schema</span>
						<select
							value={artifactSchema}
							onchange={handleSchemaChange}
							class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
						>
							{#each artifactSchemas as schemaOption (schemaOption.name)}
								<option value={schemaOption.name}>{schemaOption.label}</option>
							{/each}
						</select>
					</label>
					<button
						type="button"
						class="px-3 py-2 rounded-full bg-walnut text-cream text-sm hover:bg-copper transition-colors"
						onclick={() => (showCreateArtifactModal = true)}
					>
						Add artifact
					</button>
				</div>

				{#each artifacts as artifact (artifact.id)}
					<div
						class="rounded-2xl border border-walnut/10 bg-cream/60 p-4 flex flex-col gap-3 cursor-pointer hover:border-copper/40"
						onclick={() => startArtifactEdit(artifact)}
						role="button"
						tabindex="0"
						onkeydown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								startArtifactEdit(artifact);
							}
						}}
					>
						<div class="flex flex-wrap items-center gap-3 text-xs text-ash">
							<span class="uppercase tracking-wide">Schema {artifact.schema}</span>
							<span
								class={`rounded-full border px-2 py-0.5 ${
									artifact.isPublished
										? 'border-emerald-200/60 text-emerald-700 bg-emerald-50/60'
										: 'border-walnut/10 text-ash bg-cream/60'
								}`}
							>
								{artifact.isPublished ? 'Live' : 'Draft'}
							</span>
							<div class="ml-auto flex gap-2">
								<button
									type="button"
									class="text-xs uppercase tracking-wide text-ash hover:text-red-600"
									onclick={(event) => {
										event.stopPropagation();
										void deleteArtifact(artifact.id);
									}}
								>
									Delete
								</button>
							</div>
						</div>
						<div>
							{#if artifact.schema === 'image-v1'}
								<ImageArtifactAdminList data={artifact.dataBlob as ImageV1Data} />
							{:else}
								<p class="text-xs text-ash">Unsupported schema.</p>
							{/if}
						</div>
						<p class="text-[11px] text-ash">Click to edit details.</p>
					</div>
				{/each}
			</div>
		</section>
	{:else}
		<p class="text-ash text-sm">Project not found.</p>
	{/if}

	{#if showCreateArtifactModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
			<button
				type="button"
				class="absolute inset-0 bg-black/40"
				onclick={() => (showCreateArtifactModal = false)}
				aria-label="Close create artifact modal"
			></button>
			<div class="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-xs uppercase tracking-[0.25em] text-ash">New Artifact</p>
						<h3 class="font-display text-2xl text-walnut mt-2">Add details</h3>
					</div>
					<button
						type="button"
						class="text-xs uppercase tracking-wide text-ash hover:text-copper"
						onclick={() => (showCreateArtifactModal = false)}
					>
						Close
					</button>
				</div>

				<form class="mt-6 grid gap-4" onsubmit={createArtifact}>
					<label class="text-sm">
						<span class="text-ash">Schema</span>
						<select
							value={artifactSchema}
							onchange={handleSchemaChange}
							class="mt-1 w-full rounded-md border border-walnut/20 px-3 py-2 bg-white"
						>
							{#each artifactSchemas as schemaOption (schemaOption.name)}
								<option value={schemaOption.name}>{schemaOption.label}</option>
							{/each}
						</select>
					</label>
					<ImageArtifactEditor
						value={artifactDraft}
						onChange={handleArtifactDraftChange}
						onUpload={handleArtifactUpload}
						onUploadStateChange={handleArtifactUploadStateChange}
					/>
					<label class="flex items-center gap-2 text-sm text-ash">
						<input type="checkbox" bind:checked={artifactIsPublished} class="accent-copper" />
						Published
					</label>
					{#if artifactDraftErrors.length > 0}
						<p class="text-xs text-red-700">{artifactDraftErrors.join('; ')}</p>
					{/if}
					{#if artifactUploadState.error}
						<p class="text-xs text-red-700">{artifactUploadState.error}</p>
					{/if}
					{#if artifactUploadState.uploading}
						<p class="text-xs text-ash">Uploading image...</p>
					{/if}
					<div class="flex flex-wrap gap-3">
						<button
							type="submit"
							class="px-4 py-2 rounded-full bg-walnut text-cream text-sm hover:bg-copper transition-colors"
						>
							Create artifact
						</button>
						<button
							type="button"
							class="px-4 py-2 rounded-full border border-walnut/20 text-sm text-ash hover:text-walnut"
							onclick={() => (showCreateArtifactModal = false)}
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showEditArtifactModal && editingArtifactId !== null}
		<div class="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
			<button
				type="button"
				class="absolute inset-0 bg-black/40"
				onclick={cancelArtifactEdit}
				aria-label="Close edit artifact modal"
			></button>
			<div class="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-xs uppercase tracking-[0.25em] text-ash">Edit Artifact</p>
						<h3 class="font-display text-2xl text-walnut mt-2">Artifact details</h3>
					</div>
					<button
						type="button"
						class="text-xs uppercase tracking-wide text-ash hover:text-copper"
						onclick={cancelArtifactEdit}
					>
						Close
					</button>
				</div>

				<div class="mt-6 grid gap-4">
					<p class="text-xs uppercase tracking-[0.2em] text-ash">
						Schema <span class="text-walnut">image-v1</span>
					</p>
					<ImageArtifactEditor
						value={editArtifactDraft}
						onChange={handleEditArtifactDraftChange}
						onUpload={handleArtifactUpload}
						onUploadStateChange={handleEditArtifactUploadStateChange}
					/>
					<label class="flex items-center gap-2 text-sm text-ash">
						<input type="checkbox" bind:checked={editArtifactIsPublished} class="accent-copper" />
						Published
					</label>
					{#if editArtifactErrors.length > 0}
						<p class="text-xs text-red-700">{editArtifactErrors.join('; ')}</p>
					{/if}
					{#if editArtifactUploadState.error}
						<p class="text-xs text-red-700">{editArtifactUploadState.error}</p>
					{/if}
					{#if editArtifactUploadState.uploading}
						<p class="text-xs text-ash">Uploading image...</p>
					{/if}
					<div class="flex flex-wrap gap-3">
						<button
							type="button"
							class="px-4 py-2 rounded-full bg-walnut text-cream text-sm hover:bg-copper transition-colors"
							onclick={saveArtifactEdit}
						>
							Save changes
						</button>
						<button
							type="button"
							class="px-4 py-2 rounded-full border border-walnut/20 text-sm text-ash hover:text-walnut"
							onclick={cancelArtifactEdit}
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if pageError}
		<div class="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{pageError}
		</div>
	{/if}
	{#if pageSuccess}
		<p class="mt-4 text-sm text-emerald-700">{pageSuccess}</p>
	{/if}
</SignedIn>

<SignedOut>
	<div class="mt-8 p-4 bg-red-50 border border-red-200 rounded">
		<p class="text-red-700">You need to be signed in to access this page.</p>
	</div>
</SignedOut>
