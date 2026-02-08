<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { adminStore } from '$lib/stores/admin.svelte';
	import { SignedIn, SignedOut, useClerkContext } from 'svelte-clerk';
	import ProjectEditor, { type AttributeDraft, type ProjectEditorPayload } from '../../ProjectEditor.svelte';
	import { artifactSchemas, validateArtifactData, getArtifactSchema, getArtifactComponent } from '$lib/schemas/artifacts';
	import ArtifactView from '$lib/components/artifacts/ArtifactView.svelte';
	import GooglePhotosPickerModal from '$lib/components/GooglePhotosPickerModal.svelte';
	import CoverPositionEditor from '$lib/components/CoverPositionEditor.svelte';

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
		isCover: boolean;
		coverPositionX: number;
		coverPositionY: number;
		coverZoom: number;
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

	const initialSchemaDef = artifactSchemas[0];
	const initialSchema = initialSchemaDef?.name ?? 'image-v1';
	const initialDraft = initialSchemaDef?.createDraft() ?? { imageUrl: '', description: '' };
	const initialValidation = validateArtifactData(initialSchema, initialDraft);
	let artifactSchema: string = $state(initialSchema);
	let artifactDraft = $state<Record<string, unknown>>(initialDraft as Record<string, unknown>);
	let artifactDraftErrors = $state<string[]>(initialValidation.ok ? [] : initialValidation.errors);
	let artifactIsPublished = $state(true);
	let artifactIsCover = $state(false);
	let showCreateArtifactModal = $state(false);
	let artifactUploadState = $state<{ uploading: boolean; error: string | null }>({
		uploading: false,
		error: null
	});
	let editingArtifactId = $state<number | null>(null);
	let showEditArtifactModal = $state(false);
	let editArtifactDraft = $state<Record<string, unknown>>(initialSchemaDef?.createDraft() as Record<string, unknown>);
	let editArtifactErrors = $state<string[]>([]);
	let editArtifactIsPublished = $state(false);
	let editArtifactUploadState = $state<{ uploading: boolean; error: string | null }>({
		uploading: false,
		error: null
	});
	let editArtifactIsCover = $state(false);
	let editCoverPositionX = $state(50);
	let editCoverPositionY = $state(50);
	let editCoverZoom = $state(1);

	let addArtifactStep = $state<'idle' | 'pick-source'>('idle');
	let googlePhotosConnected = $state(false);
	let showGooglePhotosPickerModal = $state(false);
	let dropUploading = $state(false);
	let dropProgress = $state({ done: 0, total: 0 });

	let defaultPublishNew = $state(true);
	let defaultSkipDescription = $state(true);

	let rearranging = $state(false);
	let draggedId = $state<number | null>(null);
	let dropTargetId = $state<number | null>(null);
	let reorderSaving = $state(false);

	function handleArtifactDragStart(event: DragEvent, artifact: ProjectArtifact) {
		draggedId = artifact.id;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', String(artifact.id));
		}
	}

	function handleArtifactDragOver(event: DragEvent, artifact: ProjectArtifact) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dropTargetId = artifact.id;
	}

	function handleArtifactDragLeave() {
		dropTargetId = null;
	}

	async function handleArtifactDrop(event: DragEvent, targetArtifact: ProjectArtifact) {
		event.preventDefault();
		dropTargetId = null;

		if (draggedId === null || draggedId === targetArtifact.id) {
			draggedId = null;
			return;
		}

		const fromIndex = artifacts.findIndex((a) => a.id === draggedId);
		const toIndex = artifacts.findIndex((a) => a.id === targetArtifact.id);
		if (fromIndex === -1 || toIndex === -1) {
			draggedId = null;
			return;
		}

		const reordered = [...artifacts];
		const [moved] = reordered.splice(fromIndex, 1);
		reordered.splice(toIndex, 0, moved);
		artifacts = reordered;
		draggedId = null;

		reorderSaving = true;
		try {
			const token = await getToken();
			if (!token) return;
			await fetch(`/api/admin/projects/${projectId}/artifacts/reorder`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ ids: artifacts.map((a) => a.id) })
			});
		} finally {
			reorderSaving = false;
		}
	}

	function handleArtifactDragEnd() {
		draggedId = null;
		dropTargetId = null;
	}

	let editingArtifactIndex = $derived(
		editingArtifactId !== null ? artifacts.findIndex((a) => a.id === editingArtifactId) : -1
	);

	let editNeighborArtifacts = $derived.by(() => {
		if (editingArtifactIndex === -1) return [];
		const neighbors: Array<{ artifact: ProjectArtifact; offset: number }> = [];
		for (let d = -2; d <= 2; d++) {
			if (d === 0) continue;
			const idx = editingArtifactIndex + d;
			if (idx >= 0 && idx < artifacts.length) {
				neighbors.push({ artifact: artifacts[idx], offset: d });
			}
		}
		return neighbors;
	});

	const CreateEditorComp = $derived(getArtifactComponent(artifactSchema, 'adminEditor'));
	const editArtifactSchema = $derived(
		editingArtifactId !== null ? (artifacts.find(a => a.id === editingArtifactId)?.schema ?? artifactSchema) : artifactSchema
	);
	const EditEditorComp = $derived(getArtifactComponent(editArtifactSchema, 'adminEditor'));

	let editingField = $state<'name' | 'displayName' | 'description' | null>(null);
	let editName = $state('');
	let editDisplayName = $state('');
	let editDescription = $state('');

	let nameInput: HTMLInputElement | undefined = $state();
	let displayNameInput: HTMLInputElement | undefined = $state();
	let descriptionInput: HTMLTextAreaElement | undefined = $state();

	let isSavingBasicInfo = $state(false);
	let showDeleteProjectModal = $state(false);
	let isDeletingProject = $state(false);

	function handleSchemaChange(event: Event) {
		const target = event.currentTarget as HTMLSelectElement | null;
		const nextSchema = target?.value ?? '';
		artifactSchema = nextSchema;
		artifactUploadState = { uploading: false, error: null };
		const schema = getArtifactSchema(nextSchema);
		if (!schema) return;
		const nextDraft = schema.createDraft();
		artifactDraft = nextDraft as Record<string, unknown>;
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
		const response = await fetch(`/api/admin/projects/${id}`, { headers });
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
		const response = await fetch('/api/admin/categories', { headers });
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
		const response = await fetch(`/api/admin/projects/${id}/categories`, { headers });
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
		const response = await fetch(`/api/admin/projects/${id}/attributes`, { headers });
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
		const response = await fetch(`/api/admin/projects/${id}/artifacts`, { headers });
		if (!response.ok) {
			throw new Error('Failed to load project artifacts');
		}
		artifacts = await response.json();
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
			// Non-critical
		}
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
				fetchProjectArtifacts(id),
				fetchGooglePhotosStatus()
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
			const response = await fetch(`/api/admin/projects/${projectId}/categories`, {
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
			const response = await fetch(`/api/admin/projects/${projectId}/categories`, {
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

		const response = await fetch(`/api/admin/projects/${projectId}/attributes`, {
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

		const response = await fetch(`/api/admin/projects/${projectId}`, {
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

		const response = await fetch(`/api/admin/projects/${projectId}/artifacts`, {
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

		// Set as cover if toggled
		if (artifactIsCover) {
			const coverRes = await fetch(`/api/admin/projects/${projectId}/cover`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ artifactId: created.id })
			});
			if (coverRes.ok) {
				artifacts = artifacts.map((a) => ({ ...a, isCover: a.id === created.id }));
			}
		}

		artifactSchema = schema;
		const schemaDef = getArtifactSchema(schema);
		artifactDraft = (schemaDef?.createDraft() ?? { imageUrl: '', description: '' }) as Record<string, unknown>;
		artifactDraftErrors = [];
		artifactIsPublished = defaultPublishNew;
		artifactIsCover = false;
		showCreateArtifactModal = false;
		pageSuccess = 'Artifact created.';
	}

	function handleArtifactDraftChange(next: Record<string, unknown>) {
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
		const response = await fetch('/api/admin/uploads/artifacts', {
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
		if (!getArtifactComponent(artifact.schema, 'adminEditor')) {
			pageError = 'Unsupported schema for editing.';
			return;
		}
		const schemaDef = getArtifactSchema(artifact.schema);
		const validation = validateArtifactData(artifact.schema, artifact.dataBlob);
		editingArtifactId = artifact.id;
		editArtifactDraft = validation.ok ? (validation.value as Record<string, unknown>) : ((schemaDef?.createDraft() ?? {}) as Record<string, unknown>);
		editArtifactErrors = validation.ok ? [] : validation.errors;
		editArtifactIsPublished = artifact.isPublished;
		editArtifactIsCover = artifact.isCover;
		editCoverPositionX = artifact.coverPositionX ?? 50;
		editCoverPositionY = artifact.coverPositionY ?? 50;
		editCoverZoom = artifact.coverZoom ?? 1;
		editArtifactUploadState = { uploading: false, error: null };
		showEditArtifactModal = true;
	}

	function cancelArtifactEdit() {
		editingArtifactId = null;
		editArtifactDraft = (initialSchemaDef?.createDraft() ?? {}) as Record<string, unknown>;
		editArtifactErrors = [];
		editArtifactIsPublished = false;
		editArtifactIsCover = false;
		editCoverPositionX = 50;
		editCoverPositionY = 50;
		editCoverZoom = 1;
		editArtifactUploadState = { uploading: false, error: null };
		showEditArtifactModal = false;
	}

	function navigateToArtifact(artifact: ProjectArtifact) {
		startArtifactEdit(artifact);
	}

	function getArtifactImageUrl(artifact: ProjectArtifact): string {
		const data = artifact.dataBlob as Record<string, unknown> | null;
		return typeof data?.imageUrl === 'string' ? data.imageUrl : '';
	}

	function handleEditArtifactDraftChange(next: Record<string, unknown>) {
		editArtifactDraft = next;
		const validation = validateArtifactData(editArtifactSchema, next);
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
		const validation = validateArtifactData(editArtifactSchema, editArtifactDraft);
		if (!validation.ok) {
			editArtifactErrors = validation.errors;
			return;
		}
		const token = await getToken();
		if (!token) {
			pageError = 'Sign in to update artifacts.';
			return;
		}
		const response = await fetch(`/api/admin/projects/${projectId}/artifacts/${editingArtifactId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				schema: editArtifactSchema,
				dataBlob: validation.value,
				isPublished: editArtifactIsPublished
			})
		});
		if (!response.ok) {
			pageError = 'Unable to update artifact.';
			return;
		}
		const updated = await response.json();
		const wasCover = updated.isCover;
		artifacts = artifacts.map((artifact) => (artifact.id === updated.id ? updated : artifact));

		// Handle cover toggle and position
		if (editArtifactIsCover) {
			// Always PUT when cover is on — position may have changed even if already cover
			const coverRes = await fetch(`/api/admin/projects/${projectId}/cover`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ artifactId: editingArtifactId, positionX: editCoverPositionX, positionY: editCoverPositionY, zoom: editCoverZoom })
			});
			if (!coverRes.ok) {
				pageError = 'Artifact saved but failed to set as cover.';
				cancelArtifactEdit();
				return;
			}
			artifacts = artifacts.map((a) => ({
				...a,
				isCover: a.id === editingArtifactId,
				coverPositionX: a.id === editingArtifactId ? editCoverPositionX : a.coverPositionX,
				coverPositionY: a.id === editingArtifactId ? editCoverPositionY : a.coverPositionY,
				coverZoom: a.id === editingArtifactId ? editCoverZoom : a.coverZoom
			}));
		} else if (!editArtifactIsCover && wasCover) {
			const coverRes = await fetch(`/api/admin/projects/${projectId}/cover`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!coverRes.ok) {
				pageError = 'Artifact saved but failed to clear cover.';
				cancelArtifactEdit();
				return;
			}
			artifacts = artifacts.map((a) => ({ ...a, isCover: false }));
		}

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
		const response = await fetch(`/api/admin/projects/${projectId}/artifacts/${artifactId}`, {
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

	async function setCoverArtifact(artifactId: number) {
		pageError = '';
		pageSuccess = '';
		const token = await getToken();
		if (!token) {
			pageError = 'Sign in to set cover.';
			return;
		}

		const response = await fetch(`/api/admin/projects/${projectId}/cover`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ artifactId })
		});

		if (!response.ok) {
			pageError = 'Unable to set cover artifact.';
			return;
		}

		artifacts = artifacts.map((a) => ({
			...a,
			isCover: a.id === artifactId
		}));
		pageSuccess = 'Cover artifact set.';
	}

	async function clearCoverArtifact() {
		pageError = '';
		pageSuccess = '';
		const token = await getToken();
		if (!token) {
			pageError = 'Sign in to clear cover.';
			return;
		}

		const response = await fetch(`/api/admin/projects/${projectId}/cover`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok) {
			pageError = 'Unable to clear cover artifact.';
			return;
		}

		artifacts = artifacts.map((a) => ({
			...a,
			isCover: false
		}));
		pageSuccess = 'Cover cleared.';
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

			const response = await fetch(`/api/admin/projects/${projectId}`, {
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

	async function deleteProject() {
		isDeletingProject = true;
		pageError = '';
		try {
			const token = await getToken();
			if (!token) {
				pageError = 'Sign in to delete projects.';
				return;
			}
			const response = await fetch(`/api/admin/projects/${projectId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) {
				pageError = 'Unable to delete project.';
				return;
			}
			adminStore.projects = adminStore.projects.filter((p) => p.id !== projectId);
			await goto('/admin');
		} finally {
			isDeletingProject = false;
			showDeleteProjectModal = false;
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

	$effect(() => {
		if (!showEditArtifactModal) return;

		function handleKeydown(event: KeyboardEvent) {
			const tag = (document.activeElement as HTMLElement)?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				const prevIdx = editingArtifactIndex - 1;
				if (prevIdx >= 0) navigateToArtifact(artifacts[prevIdx]);
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				const nextIdx = editingArtifactIndex + 1;
				if (nextIdx < artifacts.length) navigateToArtifact(artifacts[nextIdx]);
			}
		}

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	onMount(() => {
		function onFileDrop(e: Event) {
			const files = (e as CustomEvent).detail?.files as FileList | undefined;
			if (files && files.length > 0) {
				const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
				if (imageFiles.length === 0) return;
				handleFileDropFromList(imageFiles);
			}
		}
		function onImageUrlDrop(e: Event) {
			const url = (e as CustomEvent).detail?.url as string | undefined;
			if (url) handleImageUrlDrop(url);
		}
		function onDropError(e: Event) {
			pageError = (e as CustomEvent).detail?.message ?? 'Drop failed.';
		}
		window.addEventListener('admin-file-drop', onFileDrop);
		window.addEventListener('admin-image-url-drop', onImageUrlDrop);
		window.addEventListener('admin-drop-error', onDropError);
		return () => {
			window.removeEventListener('admin-file-drop', onFileDrop);
			window.removeEventListener('admin-image-url-drop', onImageUrlDrop);
			window.removeEventListener('admin-drop-error', onDropError);
		};
	});

	async function handleImageUrlDrop(imageUrl: string) {
		const token = await getToken();
		if (!token) {
			pageError = 'Sign in to upload images.';
			return;
		}

		dropUploading = true;
		dropProgress = { done: 0, total: 1 };
		addArtifactStep = 'idle';
		pageError = '';

		try {
			// Use server-side proxy to fetch the image (bypasses CORS)
			const uploadResponse = await fetch('/api/admin/uploads/artifacts/from-url', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ url: imageUrl })
			});

			if (!uploadResponse.ok) {
				const err = await uploadResponse.json().catch(() => null);
				throw new Error(err?.message || `Upload failed (${uploadResponse.status})`);
			}

			const { url } = await uploadResponse.json();

			const dataBlob: Record<string, unknown> = { imageUrl: url };
			if (!defaultSkipDescription) {
				dataBlob.description = imageUrl.split('/').pop()?.split('?')[0] || 'image';
			}
			const artifactResponse = await fetch(`/api/admin/projects/${projectId}/artifacts`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					schema: 'image-v1',
					dataBlob,
					isPublished: defaultPublishNew
				})
			});

			if (artifactResponse.ok) {
				const artifact = await artifactResponse.json();
				artifacts = [{ ...artifact, projectId, isCover: false, coverPositionX: 50, coverPositionY: 50, coverZoom: 1 }, ...artifacts];
				pageSuccess = 'Uploaded 1 image.';
			} else {
				pageError = 'Failed to create artifact.';
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : '';
			pageError = msg || 'Can\'t import from that URL. Drag from desktop, use the upload button, or copy the image and paste (Cmd+V).';
		}

		dropProgress = { done: 1, total: 1 };
		dropUploading = false;
	}

	async function handleFileDropFromList(files: File[]) {
		const token = await getToken();
		if (!token) {
			pageError = 'Sign in to upload images.';
			return;
		}

		dropUploading = true;
		dropProgress = { done: 0, total: files.length };
		addArtifactStep = 'idle';
		pageError = '';

		const created: typeof artifacts = [];

		for (const file of files) {
			try {
				const url = await handleArtifactUpload(file);
				const dataBlob: Record<string, unknown> = { imageUrl: url };
				if (!defaultSkipDescription) {
					dataBlob.description = file.name;
				}
				const response = await fetch(`/api/admin/projects/${projectId}/artifacts`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						schema: 'image-v1',
						dataBlob,
						isPublished: defaultPublishNew
					})
				});

				if (response.ok) {
					const artifact = await response.json();
					created.push({ ...artifact, projectId, isCover: false, coverPositionX: 50, coverPositionY: 50, coverZoom: 1 });
				}
			} catch {
				// continue with remaining files
			}
			dropProgress = { done: dropProgress.done + 1, total: files.length };
		}

		dropUploading = false;

		if (created.length > 0) {
			artifacts = [...created, ...artifacts];
			pageSuccess = `Uploaded ${created.length} image${created.length !== 1 ? 's' : ''}.`;
		}
	}
</script>

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
				/>
			{/key}

			<!-- Danger Zone -->
			<div class="mt-6 pt-6 border-t border-red-200">
				<div class="flex items-center justify-between gap-4">
					<div>
						<h2 class="text-sm font-semibold text-red-900">Danger zone</h2>
						<p class="text-xs text-red-700/70 mt-0.5">Permanently delete this project and all its data.</p>
					</div>
					<button
						type="button"
						class="px-4 py-1.5 rounded-lg border border-red-300 bg-white text-xs font-medium text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors duration-150"
						onclick={() => (showDeleteProjectModal = true)}
					>
						Delete project
					</button>
				</div>
			</div>
		</section>

		<section class="mt-6">
			<div class="flex items-center justify-between gap-4 mb-6">
				<div class="flex items-center gap-3">
					<div>
						<h2 class="text-lg font-semibold text-slate-900">Artifacts</h2>
						<p class="text-sm text-slate-500 mt-0.5">Versioned data snapshots for the project.</p>
					</div>
					<button
						type="button"
						onclick={() => { rearranging = !rearranging; }}
						class={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all duration-150 ${
							rearranging
								? 'border-blue-300 bg-blue-50 text-blue-700'
								: 'border-slate-200 text-slate-600 hover:bg-slate-50'
						}`}
					>
						{#if reorderSaving}
							Saving...
						{:else if rearranging}
							Done
						{:else}
							Rearrange
						{/if}
					</button>
				</div>
				<div class="flex items-center gap-4">
					<div class="flex items-center gap-2">
						<button
							type="button"
							role="switch"
							aria-checked={defaultPublishNew}
							aria-label="Auto-publish new artifacts"
							onclick={() => { defaultPublishNew = !defaultPublishNew; }}
							class={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${defaultPublishNew ? 'bg-emerald-500' : 'bg-slate-200'}`}
						>
							<span class={`pointer-events-none inline-block h-3 w-3 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${defaultPublishNew ? 'translate-x-[13px]' : 'translate-x-[2px]'}`}></span>
						</button>
						<span class="text-[11px] text-slate-500">Auto-publish</span>
					</div>
					<div class="flex items-center gap-2">
						<button
							type="button"
							role="switch"
							aria-checked={defaultSkipDescription}
							aria-label="Skip description on new artifacts"
							onclick={() => { defaultSkipDescription = !defaultSkipDescription; }}
							class={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${defaultSkipDescription ? 'bg-slate-600' : 'bg-slate-200'}`}
						>
							<span class={`pointer-events-none inline-block h-3 w-3 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${defaultSkipDescription ? 'translate-x-[13px]' : 'translate-x-[2px]'}`}></span>
						</button>
						<span class="text-[11px] text-slate-500">Skip descriptions</span>
					</div>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				<!-- New Artifact Card -->
				{#if rearranging}
					<!-- Hide add card during rearrange mode -->
				{:else if dropUploading}
					<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5 flex flex-col items-center justify-center gap-3 min-h-[160px] transition-all duration-150">
						<div class="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"></div>
						<span class="text-xs font-medium text-slate-500">{dropProgress.done} of {dropProgress.total} uploaded</span>
					</div>
				{:else if addArtifactStep === 'idle'}
					<div
						class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5 flex flex-col items-center justify-center gap-3 min-h-[160px] hover:border-slate-400 hover:bg-slate-50 transition-all duration-150 cursor-pointer"
						onclick={() => (addArtifactStep = 'pick-source')}
						role="button"
						tabindex="0"
						onkeydown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								addArtifactStep = 'pick-source';
							}
						}}
					>
						<svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
						</svg>
						<span class="text-xs font-medium text-slate-500">Add artifact</span>
					</div>
				{:else}
					<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5 flex flex-col items-center justify-center gap-3 min-h-[160px] transition-all duration-150">
						<div class="flex gap-3">
							<button
								type="button"
								class="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-400 hover:shadow-sm transition-all duration-150"
								onclick={() => {
									addArtifactStep = 'idle';
									showCreateArtifactModal = true;
								}}
							>
								<svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
								</svg>
								<span class="text-xs font-medium text-slate-600">Upload File</span>
							</button>
							<button
								type="button"
								class={`flex flex-col items-center gap-2 rounded-xl border px-5 py-4 transition-all duration-150 ${
									googlePhotosConnected
										? 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm'
										: 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
								}`}
								onclick={() => {
									if (!googlePhotosConnected) return;
									addArtifactStep = 'idle';
									showGooglePhotosPickerModal = true;
								}}
								disabled={!googlePhotosConnected}
							>
								<svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								<span class="text-xs font-medium text-slate-600">Google Photos</span>
								{#if !googlePhotosConnected}
									<a
										href="/admin/integrations/google-photos"
										class="text-[10px] text-slate-400 underline"
										onclick={(e) => e.stopPropagation()}
									>Not connected</a>
								{/if}
							</button>
						</div>
						<button
							type="button"
							class="text-[11px] text-slate-400 hover:text-slate-600 transition-colors duration-150"
							onclick={() => (addArtifactStep = 'idle')}
						>
							&larr; Back
						</button>
					</div>
				{/if}

				<!-- Existing Artifacts -->
				{#each artifacts as artifact (artifact.id)}
					<div
						class="rounded-2xl border bg-white overflow-hidden flex flex-col transition-all duration-200 {rearranging
							? (draggedId === artifact.id ? 'opacity-50 border-slate-300' : dropTargetId === artifact.id ? 'border-blue-400 border-2 shadow-lg' : 'border-slate-200 cursor-grab hover:border-slate-300')
							: 'border-slate-200 cursor-pointer hover:border-slate-300 hover:shadow-md'}"
						draggable={rearranging}
						ondragstart={(e) => rearranging && handleArtifactDragStart(e, artifact)}
						ondragover={(e) => rearranging && handleArtifactDragOver(e, artifact)}
						ondragleave={() => rearranging && handleArtifactDragLeave()}
						ondrop={(e) => rearranging && handleArtifactDrop(e, artifact)}
						ondragend={() => rearranging && handleArtifactDragEnd()}
						onclick={() => !rearranging && startArtifactEdit(artifact)}
						role="button"
						tabindex="0"
						onkeydown={(event) => {
							if (!rearranging && (event.key === 'Enter' || event.key === ' ')) {
								event.preventDefault();
								startArtifactEdit(artifact);
							}
						}}
					>
						<div class="flex flex-wrap items-center gap-2.5 text-xs p-3 pb-0">
							{#if rearranging}
								<svg class="w-4 h-4 text-slate-300 shrink-0" viewBox="0 0 24 24" fill="currentColor">
									<circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
									<circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
									<circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
								</svg>
							{/if}
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
							{#if artifact.isCover}
								<button
									type="button"
									class="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors duration-150"
									onclick={(event) => {
										event.stopPropagation();
										void clearCoverArtifact();
									}}
									title="Click to remove as cover"
								>
									<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
										<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
									</svg>
									Cover
								</button>
							{:else}
								<button
									type="button"
									class="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-slate-400 border border-transparent hover:bg-slate-100 hover:text-slate-600 hover:border-slate-200 transition-all duration-150"
									onclick={(event) => {
										event.stopPropagation();
										void setCoverArtifact(artifact.id);
									}}
									title="Set as cover"
								>
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
									</svg>
									Set cover
								</button>
							{/if}
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
						<div class="p-3">
							<ArtifactView schema={artifact.schema} data={artifact.dataBlob} />
						</div>
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
			<div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
				<div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
					<h3 class="text-sm font-semibold text-slate-900">New Artifact</h3>
					<button
						type="button"
						class="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
						onclick={() => (showCreateArtifactModal = false)}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<form class="px-5 py-4 grid gap-3" onsubmit={createArtifact}>
					{#if CreateEditorComp}
						<CreateEditorComp
							value={artifactDraft}
							onChange={handleArtifactDraftChange}
							onUpload={handleArtifactUpload}
							onUploadStateChange={handleArtifactUploadStateChange}
							{googlePhotosConnected}
							onGooglePhotosPick={() => {
								showCreateArtifactModal = false;
								showGooglePhotosPickerModal = true;
							}}
						/>
					{/if}
					{#if artifactDraftErrors.length > 0 || artifactUploadState.error}
						<p class="text-xs font-medium text-red-600">
							{[...artifactDraftErrors, artifactUploadState.error].filter(Boolean).join('; ')}
						</p>
					{/if}
					<div class="flex items-center justify-between pt-3 border-t border-slate-100">
						<div class="flex items-center gap-4">
							<div class="flex items-center gap-2.5">
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
								<span class="text-xs text-slate-500">{artifactIsPublished ? 'Published' : 'Draft'}</span>
							</div>
							<div class="flex items-center gap-2.5">
								<button
									type="button"
									role="switch"
									aria-checked={artifactIsCover}
									aria-label="Toggle cover"
									onclick={() => { artifactIsCover = !artifactIsCover; }}
									class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${artifactIsCover ? 'bg-amber-500' : 'bg-slate-200'}`}
								>
									<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${artifactIsCover ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
								</button>
								<span class="text-xs text-slate-500">{artifactIsCover ? 'Cover' : 'Not cover'}</span>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150"
								onclick={() => (showCreateArtifactModal = false)}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={artifactUploadState.uploading}
								class="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
							>
								{artifactUploadState.uploading ? 'Uploading...' : 'Create'}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Edit Artifact Modal -->
	{#if showEditArtifactModal && editingArtifactId !== null}
		<div class="fixed inset-0 z-50 flex items-center justify-center px-4 py-10 overflow-hidden">
			<button
				type="button"
				class="absolute inset-0 bg-white/15 backdrop-blur-3xl backdrop-saturate-200"
				onclick={cancelArtifactEdit}
				aria-label="Close edit artifact modal"
			></button>

			<!-- Neighbor artifact cards -->
			{#each editNeighborArtifacts as { artifact, offset } (artifact.id)}
				{@const absOffset = Math.abs(offset)}
				{@const sign = offset > 0 ? 1 : -1}
				{@const scale = absOffset === 1 ? 0.75 : 0.5}
				{@const opacity = absOffset === 1 ? 0.8 : 0.5}
				{@const translateX = sign * (absOffset === 1 ? 380 : 600)}
				<button
					type="button"
					class="absolute top-1/2 left-1/2 z-40 cursor-pointer rounded-2xl bg-white shadow-lg ring-1 ring-white/10 hover:ring-white/40 transition-all duration-300 overflow-hidden w-64 text-left"
					style="transform: translate(-50%, -50%) translateX({translateX}px) scale({scale}); opacity: {opacity};"
					onclick={() => navigateToArtifact(artifact)}
					aria-label="Go to artifact"
				>
					<div class="p-4 flex flex-col gap-2.5">
						<div class="flex flex-wrap items-center gap-2 text-xs">
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
							{#if artifact.isCover}
								<span class="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
									<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
										<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
									</svg>
									Cover
								</span>
							{/if}
						</div>
						<ArtifactView schema={artifact.schema} data={artifact.dataBlob} />
					</div>
				</button>
			{/each}

			<!-- Navigation arrows -->
			{#if editingArtifactIndex > 0}
				<button
					type="button"
					class="absolute left-4 top-1/2 -translate-y-1/2 z-[60] rounded-full bg-white/90 p-2 shadow-lg hover:bg-white transition-colors duration-150"
					onclick={() => navigateToArtifact(artifacts[editingArtifactIndex - 1])}
					aria-label="Previous artifact"
				>
					<svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
			{/if}
			{#if editingArtifactIndex < artifacts.length - 1}
				<button
					type="button"
					class="absolute right-4 top-1/2 -translate-y-1/2 z-[60] rounded-full bg-white/90 p-2 shadow-lg hover:bg-white transition-colors duration-150"
					onclick={() => navigateToArtifact(artifacts[editingArtifactIndex + 1])}
					aria-label="Next artifact"
				>
					<svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			{/if}

			<!-- Main edit modal -->
			<div class="relative z-50 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
				<div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
					<div class="flex items-center gap-2">
						<h3 class="text-sm font-semibold text-slate-900">Edit Artifact</h3>
						<span class="text-[11px] font-mono text-slate-400">{editingArtifactIndex + 1} / {artifacts.length}</span>
					</div>
					<button
						type="button"
						class="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
						onclick={cancelArtifactEdit}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div class="px-5 py-4 grid gap-3 max-h-[70vh] overflow-y-auto">
					{#if editArtifactIsCover && getArtifactImageUrl(artifacts.find(a => a.id === editingArtifactId)!)}
						<CoverPositionEditor
							imageUrl={getArtifactImageUrl(artifacts.find(a => a.id === editingArtifactId)!)}
							positionX={editCoverPositionX}
							positionY={editCoverPositionY}
							zoom={editCoverZoom}
							onChange={(x, y, z) => { editCoverPositionX = x; editCoverPositionY = y; editCoverZoom = z; }}
						/>
					{/if}
					{#if EditEditorComp}
						<EditEditorComp
							value={editArtifactDraft}
							onChange={handleEditArtifactDraftChange}
							onUpload={handleArtifactUpload}
							onUploadStateChange={handleEditArtifactUploadStateChange}
							{googlePhotosConnected}
							onGooglePhotosPick={() => {
								cancelArtifactEdit();
								showGooglePhotosPickerModal = true;
							}}
						/>
					{/if}
					{#if editArtifactErrors.length > 0 || editArtifactUploadState.error}
						<p class="text-xs font-medium text-red-600">
							{[...editArtifactErrors, editArtifactUploadState.error].filter(Boolean).join('; ')}
						</p>
					{/if}
					<div class="flex items-center justify-between pt-3 border-t border-slate-100">
						<div class="flex items-center gap-4">
							<div class="flex items-center gap-2.5">
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
								<span class="text-xs text-slate-500">{editArtifactIsPublished ? 'Published' : 'Draft'}</span>
							</div>
							<div class="flex items-center gap-2.5">
								<button
									type="button"
									role="switch"
									aria-checked={editArtifactIsCover}
									aria-label="Toggle cover"
									onclick={() => { editArtifactIsCover = !editArtifactIsCover; }}
									class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${editArtifactIsCover ? 'bg-amber-500' : 'bg-slate-200'}`}
								>
									<span class={`pointer-events-none inline-block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ${editArtifactIsCover ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}></span>
								</button>
								<span class="text-xs text-slate-500">{editArtifactIsCover ? 'Cover' : 'Not cover'}</span>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150"
								onclick={cancelArtifactEdit}
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={editArtifactUploadState.uploading}
								class="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
								onclick={saveArtifactEdit}
							>
								{editArtifactUploadState.uploading ? 'Uploading...' : 'Save'}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Delete Project Modal -->
	{#if showDeleteProjectModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
			<button
				type="button"
				class="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onclick={() => (showDeleteProjectModal = false)}
				aria-label="Close delete confirmation"
			></button>
			<div class="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
				<div class="px-5 pt-5 pb-4">
					<div class="flex items-center gap-3 mb-3">
						<div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
							<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</div>
						<h3 class="text-sm font-semibold text-slate-900">Delete project</h3>
					</div>
					<p class="text-sm text-slate-500">Are you sure you want to delete <strong class="text-slate-700">{project?.displayName}</strong>? This will permanently remove the project and all its artifacts. This action cannot be undone.</p>
				</div>
				<div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
					<button
						type="button"
						class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150"
						onclick={() => (showDeleteProjectModal = false)}
					>
						Cancel
					</button>
					<button
						type="button"
						disabled={isDeletingProject}
						class="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
						onclick={() => void deleteProject()}
					>
						{isDeletingProject ? 'Deleting...' : 'Delete project'}
					</button>
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

	<!-- Google Photos Picker Modal -->
	{#if showGooglePhotosPickerModal}
		<GooglePhotosPickerModal
			{projectId}
			{getToken}
			isPublished={defaultPublishNew}
			skipDescription={defaultSkipDescription}
			onImported={(imported) => {
				artifacts = [...imported.map(a => ({ ...a, projectId, isCover: false, coverPositionX: 50, coverPositionY: 50, coverZoom: 1 })), ...artifacts];
				showGooglePhotosPickerModal = false;
				pageSuccess = `Imported ${imported.length} item${imported.length !== 1 ? 's' : ''} from Google Photos.`;
			}}
			onClose={() => (showGooglePhotosPickerModal = false)}
		/>
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
