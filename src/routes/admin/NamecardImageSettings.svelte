<script lang="ts">
	import { onMount } from 'svelte';
	import Editor from '$lib/schemas/artifacts/image-v1/Editor.svelte';
	import CoverPositionEditor from '$lib/components/CoverPositionEditor.svelte';
	import type { NamecardImageSetting } from '$lib/types/site-settings';

	type Props = {
		getToken: () => Promise<string | null>;
	};

	let { getToken }: Props = $props();

	let setting = $state<NamecardImageSetting | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let statusMessage = $state('');
	let statusType = $state<'success' | 'error'>('success');
	let googlePhotosConnected = $state(false);

	let editorValue = $state<{ imageUrl: string; description?: string }>({ imageUrl: '', description: '' });
	let positionX = $state(50);
	let positionY = $state(50);
	let zoom = $state(1);

	const hasImage = $derived(!!editorValue.imageUrl);
	const isDirty = $derived.by(() => {
		if (!setting && hasImage) return true;
		if (setting && !hasImage) return true;
		if (!setting && !hasImage) return false;
		return (
			setting!.imageUrl !== editorValue.imageUrl ||
			setting!.positionX !== positionX ||
			setting!.positionY !== positionY ||
			setting!.zoom !== zoom
		);
	});

	async function fetchSetting() {
		loading = true;
		try {
			const token = await getToken();
			const headers: Record<string, string> = {};
			if (token) headers.Authorization = `Bearer ${token}`;
			const response = await fetch('/api/admin/site-settings/namecard-image', { headers });
			if (response.ok) {
				const data = await response.json();
				if (data) {
					setting = data as NamecardImageSetting;
					editorValue = { imageUrl: data.imageUrl, description: '' };
					positionX = data.positionX;
					positionY = data.positionY;
					zoom = data.zoom;
				}
			}
		} catch {
			// Non-critical on load
		} finally {
			loading = false;
		}
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

	async function handleUpload(file: File): Promise<string> {
		const token = await getToken();
		if (!token) throw new Error('Sign in to upload images.');

		const formData = new FormData();
		formData.append('file', file);
		const response = await fetch('/api/admin/uploads/artifacts', {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` },
			body: formData
		});

		if (!response.ok) throw new Error('Upload failed.');

		const payload = (await response.json()) as { url?: string };
		if (!payload.url) throw new Error('No URL returned from upload.');
		return payload.url;
	}

	function handleEditorChange(next: { imageUrl: string; description?: string }) {
		editorValue = next;
	}

	function handlePositionChange(x: number, y: number, z: number) {
		positionX = x;
		positionY = y;
		zoom = z;
	}

	async function handleSave() {
		if (!editorValue.imageUrl) return;
		saving = true;
		statusMessage = '';
		try {
			const token = await getToken();
			if (!token) throw new Error('Sign in to save settings.');

			const response = await fetch('/api/admin/site-settings/namecard-image', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					imageUrl: editorValue.imageUrl,
					positionX,
					positionY,
					zoom
				})
			});

			if (!response.ok) throw new Error('Failed to save.');

			const saved = (await response.json()) as NamecardImageSetting;
			setting = saved;
			statusType = 'success';
			statusMessage = 'Namecard image saved.';
		} catch (err) {
			statusType = 'error';
			statusMessage = err instanceof Error ? err.message : 'Save failed.';
		} finally {
			saving = false;
		}
	}

	async function handleRemove() {
		saving = true;
		statusMessage = '';
		try {
			const token = await getToken();
			if (!token) throw new Error('Sign in to remove settings.');

			const response = await fetch('/api/admin/site-settings/namecard-image', {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) throw new Error('Failed to remove.');

			setting = null;
			editorValue = { imageUrl: '', description: '' };
			positionX = 50;
			positionY = 50;
			zoom = 1;
			statusType = 'success';
			statusMessage = 'Namecard image removed.';
		} catch (err) {
			statusType = 'error';
			statusMessage = err instanceof Error ? err.message : 'Remove failed.';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void Promise.all([fetchSetting(), fetchGooglePhotosStatus()]);
	});
</script>

<section class="mt-10 pt-8 border-t border-slate-200">
	<div class="flex items-center justify-between mb-5">
		<div>
			<h2 class="text-sm font-semibold text-slate-900">Namecard Image</h2>
			<p class="text-xs text-slate-500 mt-0.5">Optional image for the gallery namecard tile</p>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center gap-2 py-6">
			<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"></div>
			<span class="text-xs text-slate-500">Loading...</span>
		</div>
	{:else}
		<div class="grid gap-5 max-w-md">
			<Editor
				value={editorValue}
				onChange={handleEditorChange}
				onUpload={handleUpload}
				{googlePhotosConnected}
			/>

			{#if hasImage}
				<CoverPositionEditor
					imageUrl={editorValue.imageUrl}
					{positionX}
					{positionY}
					{zoom}
					onChange={handlePositionChange}
				/>
			{/if}

			<div class="flex items-center gap-2.5">
				<button
					type="button"
					disabled={!hasImage || !isDirty || saving}
					onclick={handleSave}
					class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{saving ? 'Saving...' : 'Save'}
				</button>
				{#if setting}
					<button
						type="button"
						disabled={saving}
						onclick={handleRemove}
						class="px-4 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Remove
					</button>
				{/if}
			</div>

			{#if statusMessage}
				<p class="text-xs font-medium {statusType === 'error' ? 'text-red-600' : 'text-emerald-600'}">
					{statusMessage}
				</p>
			{/if}
		</div>
	{/if}
</section>
