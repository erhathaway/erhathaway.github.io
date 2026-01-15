<script lang="ts">
	import { onMount } from 'svelte';
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
	const projectId = Number(data.projectId);

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
	let artifactUploadState = $state<{ uploading: boolean; error: string | null }>({
		uploading: false,
		error: null
	});

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

	async function fetchProject() {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch(`/api/projects/${projectId}`, { headers });
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

	async function fetchProjectCategories() {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch(`/api/projects/${projectId}/categories`, { headers });
		if (!response.ok) {
			throw new Error('Failed to load project categories');
		}
		const rows = (await response.json()) as Category[];
		categoryIds = rows.map((row) => row.id);
	}

	async function fetchProjectAttributes() {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch(`/api/projects/${projectId}/attributes`, { headers });
		if (!response.ok) {
			throw new Error('Failed to load project attributes');
		}
		attributes = await response.json();
	}

	async function fetchProjectArtifacts() {
		const token = await getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		const response = await fetch(`/api/projects/${projectId}/artifacts`, { headers });
		if (!response.ok) {
			throw new Error('Failed to load project artifacts');
		}
		artifacts = await response.json();
	}

	async function loadAll() {
		pageError = '';
		pageSuccess = '';
		pageLoading = true;
		try {
			await Promise.all([
				fetchProject(),
				fetchCategories(),
				fetchProjectCategories(),
				fetchProjectAttributes(),
				fetchProjectArtifacts()
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

	onMount(loadAll);
</script>

<div class="h-screen bg-cream text-walnut p-8 pb-16">
	<div class="max-w-5xl mx-auto h-full overflow-y-auto pr-2">
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
				<section class="rounded-2xl border border-walnut/10 bg-white/70 p-6 shadow-sm">
					<div class="flex items-start justify-between gap-4 mb-6">
						<div>
							<h2 class="font-display text-2xl text-walnut">{project.displayName}</h2>
							<p class="text-xs text-ash">/{project.name}</p>
						</div>
						<a
							href="/admin"
							class="text-xs uppercase tracking-wide text-ash hover:text-copper"
						>
							Back to admin
						</a>
					</div>

					{#key project.id}
						<ProjectEditor
							project={project}
							{categories}
							{categoriesLoaded}
							{categoryIds}
							attributes={attributes}
							onSave={handleSave}
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

					<form class="grid gap-4 md:grid-cols-[160px_1fr] items-start" onsubmit={createArtifact}>
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
						<div class="md:col-span-1">
							<ImageArtifactEditor
								value={artifactDraft}
								onChange={handleArtifactDraftChange}
								onUpload={handleArtifactUpload}
								onUploadStateChange={handleArtifactUploadStateChange}
							/>
						</div>
						<label class="flex items-center gap-2 text-sm text-ash md:col-span-2">
							<input type="checkbox" bind:checked={artifactIsPublished} class="accent-copper" />
							Published
						</label>
						{#if artifactDraftErrors.length > 0}
							<p class="text-xs text-red-700 md:col-span-2">
								{artifactDraftErrors.join('; ')}
							</p>
						{/if}
						{#if artifactUploadState.error}
							<p class="text-xs text-red-700 md:col-span-2">
								{artifactUploadState.error}
							</p>
						{/if}
						{#if artifactUploadState.uploading}
							<p class="text-xs text-ash md:col-span-2">Uploading image...</p>
						{/if}
						<button
							type="submit"
							class="px-4 py-2 rounded-full bg-walnut text-cream text-sm hover:bg-copper transition-colors"
						>
							Create artifact
						</button>
					</form>

					{#if artifacts.length === 0}
						<p class="mt-6 text-sm text-ash">No artifacts yet.</p>
					{:else}
						<div class="mt-6 grid gap-4">
							{#each artifacts as artifact (artifact.id)}
								<div class="rounded-xl border border-walnut/10 bg-cream/60 p-4">
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
									</div>
									<div class="mt-3">
										{#if artifact.schema === 'image-v1'}
											<ImageArtifactAdminList data={artifact.dataBlob as ImageV1Data} />
										{:else}
											<p class="text-xs text-ash">Unsupported schema.</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</section>
			{:else}
				<p class="text-ash text-sm">Project not found.</p>
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
	</div>
</div>
