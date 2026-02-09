<script lang="ts">
	import { onDestroy } from 'svelte';

	type PickedItem = {
		id: string;
		createTime: string;
		type: 'PHOTO' | 'VIDEO' | 'TYPE_UNSPECIFIED';
		thumbnailUrl: string;
		mediaFile: {
			baseUrl: string;
			mimeType: string;
			filename: string;
			mediaFileMetadata: {
				width?: number;
				height?: number;
			};
		};
	};

	type ImportedArtifact = {
		id: number;
		schema: string;
		dataBlob: unknown;
		isPublished: boolean;
	};

	type Props = {
		projectId: number;
		getToken: () => Promise<string | null>;
		onImported: (artifacts: ImportedArtifact[]) => void;
		onClose: () => void;
		isPublished?: boolean;
		skipDescription?: boolean;
	};

	let { projectId, getToken, onImported, onClose, isPublished = false, skipDescription = false }: Props = $props();

	type Step = 'creating' | 'waiting' | 'loading-items' | 'confirm' | 'importing' | 'optimizing' | 'done' | 'error';
	let step = $state<Step>('creating');
	let errorMessage = $state('');

	let sessionId = $state('');
	let pickerUri = $state('');
	let pickedItems = $state<PickedItem[]>([]);
	let importedCount = $state(0);
	let totalCount = $state(0);
	let importResults = $state<{ created: ImportedArtifact[]; errors: Array<{ filename: string; error: string }> }>({ created: [], errors: [] });
	let currentFilename = $state('');
	let cancelled = $state(false);

	// Transform tracking
	let transformedCount = $state(0);
	let transformTotal = $state(0);

	let popup: Window | null = null;
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let popupCheckTimer: ReturnType<typeof setInterval> | null = null;

	const photoCount = $derived(pickedItems.filter((i) => i.type === 'PHOTO').length);
	const videoCount = $derived(pickedItems.filter((i) => i.type === 'VIDEO').length);
	const summaryText = $derived.by(() => {
		const parts: string[] = [];
		if (photoCount > 0) parts.push(`${photoCount} photo${photoCount !== 1 ? 's' : ''}`);
		if (videoCount > 0) parts.push(`${videoCount} video${videoCount !== 1 ? 's' : ''}`);
		return parts.join(' and ') || '0 items';
	});

	async function authHeaders(): Promise<Record<string, string>> {
		// Race getToken against a 10s timeout — Clerk can hang if the session
		// went stale while the user was in the Google Photos popup.
		const token = await Promise.race([
			getToken(),
			new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000))
		]);
		return token ? { Authorization: `Bearer ${token}` } : {};
	}

	// Step 1: Create session
	async function startSession() {
		step = 'creating';
		try {
			const headers = await authHeaders();
			const response = await fetch('/api/admin/integrations/google-photos/sessions', {
				method: 'POST',
				headers: { ...headers, 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || 'Failed to create session');
			}

			const data = await response.json();
			sessionId = data.sessionId;
			pickerUri = data.pickerUri;

			openPickerPopup();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to start session';
			step = 'error';
		}
	}

	// Step 2: Open popup
	function openPickerPopup() {
		step = 'waiting';

		popup = window.open(
			pickerUri + '/autoclose',
			'google-photos-picker',
			'width=1200,height=800,popup=yes'
		);

		if (!popup) {
			errorMessage = 'Popup blocked. Please allow popups for this site and try again.';
			step = 'error';
			return;
		}

		startPolling();
		startPopupCheck();
	}

	// Step 3-4: Poll session
	function startPolling() {
		pollTimer = setInterval(async () => {
			try {
				const headers = await authHeaders();
				const response = await fetch(
					`/api/admin/integrations/google-photos/sessions/${sessionId}`,
					{ headers }
				);

				if (!response.ok) return;

				const data = await response.json();
				if (data.mediaItemsSet) {
					stopPolling();
					await loadPickedItems();
				}
			} catch {
				// Retry on next tick
			}
		}, 3000);
	}

	function startPopupCheck() {
		popupCheckTimer = setInterval(() => {
			if (popup && popup.closed) {
				if (popupCheckTimer) clearInterval(popupCheckTimer);
				popupCheckTimer = null;

				setTimeout(() => {
					if (step === 'waiting') {
						stopPolling();
						onClose();
					}
				}, 30000);
			}
		}, 1000);
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
		if (popupCheckTimer) {
			clearInterval(popupCheckTimer);
			popupCheckTimer = null;
		}
	}

	// Step 5: Load picked items
	async function loadPickedItems() {
		step = 'loading-items';
		try {
			const headers = await authHeaders();
			const allItems: PickedItem[] = [];
			let pageToken: string | undefined;

			do {
				const params = new URLSearchParams();
				if (pageToken) params.set('pageToken', pageToken);

				const response = await fetch(
					`/api/admin/integrations/google-photos/sessions/${sessionId}/items?${params.toString()}`,
					{ headers }
				);

				if (!response.ok) throw new Error('Failed to load items');

				const data = await response.json();
				if (data.mediaItems) {
					allItems.push(...data.mediaItems);
				}
				pageToken = data.nextPageToken;
			} while (pageToken);

			pickedItems = allItems;

			if (pickedItems.length === 0) {
				onClose();
				return;
			}

			step = 'confirm';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to load selected items';
			step = 'error';
		}
	}

	// Step 6: Import — one item per request for memory/CPU isolation
	async function handleImport() {
		step = 'importing';
		totalCount = pickedItems.length;
		importedCount = 0;
		cancelled = false;
		currentFilename = '';
		importResults = { created: [], errors: [] };

		// Collect r2Keys for transform phase
		const r2Keys: Array<{ artifactId: number; r2Key: string; field: 'imageUrl' }> = [];

		for (const item of pickedItems) {
			if (cancelled) break;

			currentFilename = item.mediaFile.filename;

			try {
				const headers = await authHeaders();
				if (!headers.Authorization) {
					throw new Error('Session expired — please refresh the page and try again');
				}

				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 90_000);

				const response = await fetch('/api/admin/integrations/google-photos/import-item', {
					method: 'POST',
					headers: { ...headers, 'Content-Type': 'application/json' },
					body: JSON.stringify({
						projectId,
						item,
						isPublished,
						skipDescription
					}),
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					const text = await response.text();
					throw new Error(text || `Import failed (${response.status})`);
				}

				const data = await response.json();
				importResults.created = [...importResults.created, data.artifact];

				if (data.artifact.r2Key) {
					r2Keys.push({
						artifactId: data.artifact.id,
						r2Key: data.artifact.r2Key,
						field: 'imageUrl'
					});
				}
			} catch (err) {
				console.error(`[import] Failed to import ${item.mediaFile.filename}:`, err);
				const message =
					err instanceof DOMException && err.name === 'AbortError'
						? 'Timed out — please try again'
						: err instanceof Error
							? err.message
							: 'Import failed';
				importResults.errors = [
					...importResults.errors,
					{
						filename: item.mediaFile.filename,
						error: message
					}
				];
			}

			importedCount++;
		}

		currentFilename = '';

		// Clean up the picker session
		try {
			const cleanupHeaders = await authHeaders();
			await fetch(`/api/admin/integrations/google-photos/sessions/${sessionId}`, {
				method: 'DELETE',
				headers: cleanupHeaders
			});
		} catch {
			// Non-critical cleanup failure
		}

		// Notify parent with imported artifacts (before transforms)
		if (importResults.created.length > 0) {
			onImported(importResults.created);
		}

		// Step 7: Optimize — transform each image to AVIF/WebP in separate requests
		if (r2Keys.length > 0) {
			step = 'optimizing';
			transformTotal = r2Keys.length;
			transformedCount = 0;

			for (const { artifactId, r2Key, field } of r2Keys) {
				try {
					const headers = await authHeaders();
					const response = await fetch('/api/admin/images/transform', {
						method: 'POST',
						headers: { ...headers, 'Content-Type': 'application/json' },
						body: JSON.stringify({ r2Key, artifactId, field })
					});

					if (!response.ok) {
						// Non-critical — image still works in original format
					}
				} catch {
					// Non-critical
				}

				transformedCount++;
			}
		}

		step = 'done';
	}

	function handleCancelImport() {
		cancelled = true;
	}

	function handleCancel() {
		stopPolling();
		if (popup && !popup.closed) {
			popup.close();
		}
		if (sessionId) {
			authHeaders().then((headers) => {
				fetch(`/api/admin/integrations/google-photos/sessions/${sessionId}`, {
					method: 'DELETE',
					headers
				}).catch(() => {});
			});
		}
		onClose();
	}

	// Auto-start on mount
	startSession();

	onDestroy(() => {
		stopPolling();
	});
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
	<button
		type="button"
		class="absolute inset-0 bg-black/40 backdrop-blur-sm"
		onclick={step === 'importing' || step === 'optimizing' ? undefined : handleCancel}
		aria-label="Close modal"
	></button>

	<div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
		<!-- Header -->
		<div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
			<h3 class="text-sm font-semibold text-slate-900">
				{#if step === 'creating'}Creating session...
				{:else if step === 'waiting'}Picking from Google Photos
				{:else if step === 'loading-items'}Loading selected items...
				{:else if step === 'confirm'}Import from Google Photos
				{:else if step === 'importing'}Importing...
				{:else if step === 'optimizing'}Optimizing images...
				{:else if step === 'done'}Import Complete
				{:else}Error
				{/if}
			</h3>
			{#if step !== 'importing' && step !== 'optimizing'}
				<button
					type="button"
					class="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150"
					onclick={handleCancel}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>

		<!-- Body -->
		<div class="px-5 py-5">
			{#if step === 'creating' || step === 'loading-items'}
				<div class="flex flex-col items-center gap-3 py-6">
					<div class="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"></div>
					<p class="text-sm text-slate-500">
						{step === 'creating' ? 'Setting up Google Photos session...' : 'Loading your selections...'}
					</p>
				</div>

			{:else if step === 'waiting'}
				<div class="flex flex-col items-center gap-4 py-6">
					<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
						<svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
					<div class="text-center">
						<p class="text-sm font-medium text-slate-700">Select photos and videos</p>
						<p class="text-xs text-slate-400 mt-1">Choose items in the Google Photos window, then click Done.</p>
					</div>
					<div class="flex items-center gap-2 text-xs text-slate-400">
						<div class="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-400"></div>
						Waiting for selection...
					</div>
				</div>

			{:else if step === 'confirm'}
				<div class="space-y-4">
					<p class="text-sm text-slate-600">{summaryText} selected</p>

					<!-- Thumbnail preview strip -->
					{#if pickedItems.length > 0}
						<div class="flex gap-2 overflow-x-auto pb-2">
							{#each pickedItems.slice(0, 20) as item (item.id)}
								<div class="relative flex-shrink-0">
									<img
										src={item.thumbnailUrl}
										alt={item.mediaFile.filename}
										class="h-16 w-16 rounded-lg object-cover border border-slate-200"
										loading="lazy"
									/>
									{#if item.type === 'VIDEO'}
										<div class="absolute inset-0 flex items-center justify-center">
											<div class="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
												<svg class="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
													<path d="M8 5v14l11-7z" />
												</svg>
											</div>
										</div>
									{/if}
								</div>
							{/each}
							{#if pickedItems.length > 20}
								<div class="flex-shrink-0 h-16 w-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
									<span class="text-xs font-medium text-slate-400">+{pickedItems.length - 20}</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>

			{:else if step === 'importing'}
				<div class="flex flex-col items-center gap-4 py-4">
					<div class="w-full bg-slate-100 rounded-full h-2">
						<div
							class="bg-slate-900 h-2 rounded-full transition-all duration-300"
							style="width: {totalCount > 0 ? Math.max(5, (importedCount / totalCount) * 100) : 5}%"
						></div>
					</div>
					<p class="text-sm text-slate-500">
						{importedCount} of {totalCount} imported
					</p>
					{#if currentFilename}
						<p class="text-xs text-slate-400 truncate max-w-full">{currentFilename}</p>
					{/if}
				</div>

			{:else if step === 'optimizing'}
				<div class="flex flex-col items-center gap-4 py-4">
					<div class="w-full bg-slate-100 rounded-full h-2">
						<div
							class="bg-emerald-500 h-2 rounded-full transition-all duration-300"
							style="width: {transformTotal > 0 ? Math.max(5, (transformedCount / transformTotal) * 100) : 5}%"
						></div>
					</div>
					<p class="text-sm text-slate-500">
						Converting to AVIF/WebP: {transformedCount} of {transformTotal}
					</p>
				</div>

			{:else if step === 'done'}
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm text-emerald-600">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
						{importResults.created.length} item{importResults.created.length !== 1 ? 's' : ''} imported successfully.
					</div>
					{#if importResults.errors.length > 0}
						<div class="text-xs text-red-600 space-y-1">
							<p class="font-medium">{importResults.errors.length} item{importResults.errors.length !== 1 ? 's' : ''} failed:</p>
							{#each importResults.errors as err}
								<p class="text-slate-500">{err.filename}: {err.error}</p>
							{/each}
						</div>
					{/if}
				</div>

			{:else if step === 'error'}
				<div class="flex flex-col items-center gap-3 py-4">
					<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
						<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<p class="text-sm text-red-600 text-center">{errorMessage}</p>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex items-center justify-end gap-2 px-5 pb-4 pt-2 border-t border-slate-100">
			{#if step === 'confirm'}
				<button
					type="button"
					class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150"
					onclick={handleCancel}
				>
					Cancel
				</button>
				<button
					type="button"
					class="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors duration-150"
					onclick={handleImport}
				>
					Import {pickedItems.length} item{pickedItems.length !== 1 ? 's' : ''}
				</button>
			{:else if step === 'importing'}
				<button
					type="button"
					class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150"
					onclick={handleCancelImport}
				>
					Cancel
				</button>
			{:else if step === 'done' || step === 'error'}
				<button
					type="button"
					class="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors duration-150"
					onclick={onClose}
				>
					{step === 'done' ? 'Done' : 'Close'}
				</button>
			{:else if step === 'waiting'}
				<button
					type="button"
					class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150"
					onclick={handleCancel}
				>
					Cancel
				</button>
			{/if}
		</div>
	</div>
</div>
