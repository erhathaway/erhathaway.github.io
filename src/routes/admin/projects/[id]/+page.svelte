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

<header class="flex items-center justify-between gap-4 mb-8 pb-5 border-b border-slate-200">
	<div>
		<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Project Editor</p>
		<h1 class="text-xl font-semibold text-slate-900 mt-1">Manage Project</h1>
	</div>
	<UserButton />
</header>

<SignedIn>
	{#if pageLoading}
		<div class="flex items-center gap-3 py-12">
			<div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"></div>
			<p class="text-sm text-slate-500">Loading project...</p>
		</div>
	{:else if project}
		<section class="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			{#if isSavingBasicInfo}
				<div class="absolute top-4 right-4 flex items-center gap-2">
					<span class="text-xs text-slate-400 font-medium">Saving</span>
					<div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"></div>
				</div>
			{/if}
			<div class="flex items-start justify-between gap-4 mb-6">
				<div class="flex-1">
					<div class="flex items-baseline gap-3">
						{#if editingField === 'displayName'}
							<input
								bind:this={displayNameInput}
								bind:value={editDisplayName}
								class="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xl font-semibold text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
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
								class="text-xl font-semibold text-slate-900 cursor-pointer hover:text-slate-600 transition-colors duration-150"
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
								class="rounded-xl border border-slate-300 px-2.5 py-1 text-xs font-mono text-slate-500 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
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
								class="text-xs font-mono text-slate-400 cursor-pointer hover:text-slate-600 transition-colors duration-150"
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
							class="w-full mt-3 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
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
							class={`text-sm mt-2 cursor-pointer transition-colors duration-150 ${
								project.description
									? 'text-slate-500 hover:text-slate-700'
									: 'text-slate-300 italic hover:text-slate-500'
							}`}
							ondblclick={() => (editingField = 'description')}
							role="button"
							tabindex="0"
						>
							{project.description || 'No description — double-click to add'}
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

		<section class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex items-center justify-between gap-4 mb-6">
				<div>
					<h2 class="text-lg font-semibold text-slate-900">Artifacts</h2>
					<p class="text-sm text-slate-500 mt-0.5">Versioned data snapshots for the project.</p>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				<!-- New Artifact Card -->
				<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5 flex flex-col gap-4">
					<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">New Artifact</p>
					<label class="grid gap-1.5">
						<span class="text-xs font-medium text-slate-600">Schema</span>
						<select
							value={artifactSchema}
							onchange={handleSchemaChange}
							class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
						>
							{#each artifactSchemas as schemaOption (schemaOption.name)}
								<option value={schemaOption.name}>{schemaOption.label}</option>
							{/each}
						</select>
					</label>
					<button
						type="button"
						class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
						onclick={() => (showCreateArtifactModal = true)}
					>
						Add artifact
					</button>
				</div>

				<!-- Existing Artifacts -->
				{#each artifacts as artifact (artifact.id)}
					<div
						class="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-3 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all duration-200"
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
						<div class="flex flex-wrap items-center gap-2.5 text-xs">
							<span class="font-mono text-slate-400">{artifact.schema}</span>
							<span
								class={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium ${
									artifact.isPublished
										? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
										: 'bg-slate-100 text-slate-500 border border-slate-200'
								}`}
							>
								<span class={`inline-block h-1.5 w-1.5 rounded-full ${artifact.isPublished ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
								{artifact.isPublished ? 'Live' : 'Draft'}
							</span>
							<div class="ml-auto">
								<button
									type="button"
									class="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors duration-150"
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
								<p class="text-xs text-slate-400">Unsupported schema.</p>
							{/if}
						</div>
						<p class="text-[11px] text-slate-400">Click to edit</p>
					</div>
				{/each}
			</div>
		</section>
	{:else}
		<div class="flex items-center justify-center py-16">
			<p class="text-sm text-slate-400">Project not found.</p>
		</div>
	{/if}

	<!-- Create Artifact Modal -->
	{#if showCreateArtifactModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
			<button
				type="button"
				class="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onclick={() => (showCreateArtifactModal = false)}
				aria-label="Close create artifact modal"
			></button>
			<div class="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden">
				<!-- Header -->
				<div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
					<div>
						<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">New Artifact</p>
						<h3 class="text-lg font-semibold text-slate-900 mt-1">Add details</h3>
					</div>
					<button
						type="button"
						class="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
						onclick={() => (showCreateArtifactModal = false)}
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- Body -->
				<form class="px-6 py-5 grid gap-4" onsubmit={createArtifact}>
					<label class="grid gap-1.5">
						<span class="text-xs font-medium text-slate-600">Schema</span>
						<select
							value={artifactSchema}
							onchange={handleSchemaChange}
							class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150"
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
					<div class="flex items-center gap-3">
						<button
							type="button"
							role="switch"
							aria-checked={artifactIsPublished}
							aria-label="Toggle published"
							onclick={() => { artifactIsPublished = !artifactIsPublished; }}
							class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${artifactIsPublished ? 'bg-emerald-500' : 'bg-slate-200'}`}
						>
							<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${artifactIsPublished ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
						</button>
						<span class="text-sm text-slate-600">Published</span>
					</div>
					{#if artifactDraftErrors.length > 0}
						<p class="text-xs font-medium text-red-600">{artifactDraftErrors.join('; ')}</p>
					{/if}
					{#if artifactUploadState.error}
						<p class="text-xs font-medium text-red-600">{artifactUploadState.error}</p>
					{/if}
					{#if artifactUploadState.uploading}
						<div class="flex items-center gap-2">
							<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500"></div>
							<p class="text-xs text-slate-500">Uploading image...</p>
						</div>
					{/if}
					<div class="flex items-center gap-2.5 pt-2 border-t border-slate-100 mt-2">
						<button
							type="submit"
							class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
						>
							Create artifact
						</button>
						<button
							type="button"
							class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors duration-150"
							onclick={() => (showCreateArtifactModal = false)}
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Edit Artifact Modal -->
	{#if showEditArtifactModal && editingArtifactId !== null}
		<div class="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
			<button
				type="button"
				class="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onclick={cancelArtifactEdit}
				aria-label="Close edit artifact modal"
			></button>
			<div class="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden">
				<!-- Header -->
				<div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
					<div>
						<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Edit Artifact</p>
						<h3 class="text-lg font-semibold text-slate-900 mt-1">Artifact details</h3>
					</div>
					<button
						type="button"
						class="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
						onclick={cancelArtifactEdit}
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- Body -->
				<div class="px-6 py-5 grid gap-4">
					<p class="text-xs font-mono text-slate-400">
						Schema: <span class="text-slate-600">image-v1</span>
					</p>
					<ImageArtifactEditor
						value={editArtifactDraft}
						onChange={handleEditArtifactDraftChange}
						onUpload={handleArtifactUpload}
						onUploadStateChange={handleEditArtifactUploadStateChange}
					/>
					<div class="flex items-center gap-3">
						<button
							type="button"
							role="switch"
							aria-checked={editArtifactIsPublished}
							aria-label="Toggle published"
							onclick={() => { editArtifactIsPublished = !editArtifactIsPublished; }}
							class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${editArtifactIsPublished ? 'bg-emerald-500' : 'bg-slate-200'}`}
						>
							<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${editArtifactIsPublished ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
						</button>
						<span class="text-sm text-slate-600">Published</span>
					</div>
					{#if editArtifactErrors.length > 0}
						<p class="text-xs font-medium text-red-600">{editArtifactErrors.join('; ')}</p>
					{/if}
					{#if editArtifactUploadState.error}
						<p class="text-xs font-medium text-red-600">{editArtifactUploadState.error}</p>
					{/if}
					{#if editArtifactUploadState.uploading}
						<div class="flex items-center gap-2">
							<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500"></div>
							<p class="text-xs text-slate-500">Uploading image...</p>
						</div>
					{/if}
					<div class="flex items-center gap-2.5 pt-2 border-t border-slate-100 mt-2">
						<button
							type="button"
							class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
							onclick={saveArtifactEdit}
						>
							Save changes
						</button>
						<button
							type="button"
							class="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors duration-150"
							onclick={cancelArtifactEdit}
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Error Banner -->
	{#if pageError}
		<div class="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
			<svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<p class="text-sm text-red-700">{pageError}</p>
		</div>
	{/if}
	{#if pageSuccess}
		<div class="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
			<svg class="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<p class="text-sm text-emerald-700">{pageSuccess}</p>
		</div>
	{/if}
</SignedIn>

<SignedOut>
	<div class="mt-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
		<svg class="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
		<p class="text-sm text-red-700">You need to be signed in to access this page.</p>
	</div>
</SignedOut>
