<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { useClerkContext } from 'svelte-clerk';

	const ctx = useClerkContext();

	const STORAGE_KEY = 'admin-images-filters';
	const DEFAULTS = { formatFilter: 'all', statusFilter: 'all', projectFilter: 'all', sortField: 'size', sortDir: 'desc' } as const;

	interface R2ImageItem {
		key: string;
		size: number;
		contentType: string;
		uploaded: string;
		artifactId?: number;
		projectId?: number;
		projectName?: string;
		urlField?: 'imageUrl' | 'hoverImageUrl';
		settingKey?: string;
		settingLabel?: string;
		isOptimized: boolean;
	}

	let items = $state<R2ImageItem[]>([]);
	let loading = $state(true);
	let loadError = $state('');

	// Filters + sort (restored from localStorage on mount)
	let formatFilter: string = $state(DEFAULTS.formatFilter);
	let statusFilter: string = $state(DEFAULTS.statusFilter);
	let projectFilter: string = $state(DEFAULTS.projectFilter);
	let sortField: string = $state(DEFAULTS.sortField);
	let sortDir: string = $state(DEFAULTS.sortDir);

	// Selection
	let selectedKeys = $state<Set<string>>(new Set());

	// Transform progress
	let transforming = $state(false);
	let transformProgress = $state({ done: 0, total: 0, errors: 0 });
	let transformResult = $state<{ total: number; errors: number; message?: string } | null>(null);

	// --- localStorage persistence ---

	function loadSavedFilters() {
		if (!browser) return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const saved = JSON.parse(raw);
			if (saved.formatFilter) formatFilter = saved.formatFilter;
			if (saved.statusFilter) statusFilter = saved.statusFilter;
			if (saved.projectFilter) projectFilter = saved.projectFilter;
			if (saved.sortField) sortField = saved.sortField;
			if (saved.sortDir) sortDir = saved.sortDir;
		} catch {
			// ignore corrupt data
		}
	}

	function saveFilters() {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ formatFilter, statusFilter, projectFilter, sortField, sortDir }));
		} catch {
			// ignore
		}
	}

	$effect(() => {
		// Track all filter values so any change triggers a save
		void formatFilter;
		void statusFilter;
		void projectFilter;
		void sortField;
		void sortDir;
		saveFilters();
	});

	const hasNonDefaultFilters = $derived(
		formatFilter !== DEFAULTS.formatFilter ||
		statusFilter !== DEFAULTS.statusFilter ||
		projectFilter !== DEFAULTS.projectFilter ||
		sortField !== DEFAULTS.sortField ||
		sortDir !== DEFAULTS.sortDir
	);

	function resetFilters() {
		formatFilter = DEFAULTS.formatFilter;
		statusFilter = DEFAULTS.statusFilter;
		projectFilter = DEFAULTS.projectFilter;
		sortField = DEFAULTS.sortField;
		sortDir = DEFAULTS.sortDir;
	}

	// --- Column sort ---

	type SortableColumn = 'format' | 'size' | 'project' | 'date';

	function toggleSort(column: SortableColumn) {
		if (sortField === column) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = column;
			// sensible default direction per column
			sortDir = column === 'size' || column === 'date' ? 'desc' : 'asc';
		}
	}

	// --- Data ---

	async function getToken() {
		const clerk = ctx.clerk;
		const session = clerk?.session;
		if (!session) return null;
		return session.getToken();
	}

	async function loadImages() {
		loading = true;
		loadError = '';
		try {
			const token = await getToken();
			const headers: Record<string, string> = {};
			if (token) headers.Authorization = `Bearer ${token}`;
			const res = await fetch('/api/admin/images', { headers });
			if (!res.ok) throw new Error('Failed to load images');
			const data = await res.json();
			items = data.items;
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Failed to load images';
		} finally {
			loading = false;
		}
	}

	// Derived: unique projects
	const projects = $derived.by(() => {
		const map = new Map<string, string>();
		for (const item of items) {
			if (item.projectName && item.projectId) {
				map.set(String(item.projectId), item.projectName);
			}
		}
		return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
	});

	// Derived: filtered + sorted items
	const filteredItems = $derived.by(() => {
		let result = items;

		if (formatFilter !== 'all') {
			result = result.filter((item) => {
				const ext = item.key.split('.').pop()?.toLowerCase() ?? '';
				return ext === formatFilter;
			});
		}

		if (statusFilter === 'optimized') {
			result = result.filter((item) => item.isOptimized);
		} else if (statusFilter === 'unoptimized') {
			result = result.filter((item) => !item.isOptimized);
		} else if (statusFilter === 'orphan') {
			result = result.filter((item) => !item.artifactId && !item.settingKey);
		}

		if (projectFilter !== 'all') {
			result = result.filter((item) => String(item.projectId) === projectFilter);
		}

		// Sort
		result = [...result].sort((a, b) => {
			let cmp = 0;
			if (sortField === 'size') cmp = a.size - b.size;
			else if (sortField === 'date') cmp = new Date(a.uploaded).getTime() - new Date(b.uploaded).getTime();
			else if (sortField === 'format') cmp = (a.key.split('.').pop() ?? '').localeCompare(b.key.split('.').pop() ?? '');
			else if (sortField === 'project') cmp = (a.projectName ?? a.settingLabel ?? '').localeCompare(b.projectName ?? b.settingLabel ?? '');
			return sortDir === 'desc' ? -cmp : cmp;
		});

		return result;
	});

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getExtension(key: string): string {
		return key.split('.').pop()?.toUpperCase() ?? '?';
	}

	function toggleSelect(key: string) {
		const next = new Set(selectedKeys);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		selectedKeys = next;
	}

	function toggleSelectAll() {
		if (selectedKeys.size === filteredItems.length) {
			selectedKeys = new Set();
		} else {
			selectedKeys = new Set(filteredItems.map((i) => i.key));
		}
	}

	const allSelected = $derived(filteredItems.length > 0 && selectedKeys.size === filteredItems.length);

	// Transformable: selected items that are unoptimized AND have an artifact or site setting
	const transformableItems = $derived.by(() => {
		return filteredItems.filter(
			(item) => selectedKeys.has(item.key) && !item.isOptimized && ((item.artifactId && item.urlField) || item.settingKey)
		);
	});

	async function transformSelected() {
		if (transformableItems.length === 0) return;
		transforming = true;
		transformResult = null;
		transformProgress = { done: 0, total: transformableItems.length, errors: 0 };

		const token = await getToken();
		if (!token) {
			transforming = false;
			transformResult = { total: 0, errors: 0, message: 'Sign in to transform images.' };
			return;
		}

		let lastErrorMessage = '';
		for (const item of transformableItems) {
			try {
				const res = await fetch('/api/admin/images/transform', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify(
						item.settingKey
							? { r2Key: item.key, settingKey: item.settingKey }
							: { r2Key: item.key, artifactId: item.artifactId, field: item.urlField }
					)
				});
				if (!res.ok) {
					const body = await res.json().catch(() => null);
					lastErrorMessage = body?.message ?? `HTTP ${res.status}`;
					transformProgress = { ...transformProgress, errors: transformProgress.errors + 1 };
				}
			} catch (err) {
				lastErrorMessage = err instanceof Error ? err.message : 'Network error';
				transformProgress = { ...transformProgress, errors: transformProgress.errors + 1 };
			}
			transformProgress = { ...transformProgress, done: transformProgress.done + 1 };
		}

		const { errors } = transformProgress;
		const succeeded = transformProgress.total - errors;
		transforming = false;

		if (errors === transformProgress.total) {
			transformResult = {
				total: transformProgress.total,
				errors,
				message: `All ${errors} transforms failed. ${lastErrorMessage}`
			};
		} else if (errors > 0) {
			transformResult = {
				total: transformProgress.total,
				errors,
				message: `${succeeded} transformed, ${errors} failed. ${lastErrorMessage}`
			};
			selectedKeys = new Set();
			await loadImages();
		} else {
			transformResult = {
				total: transformProgress.total,
				errors: 0,
				message: `${succeeded} image${succeeded !== 1 ? 's' : ''} transformed successfully.`
			};
			selectedKeys = new Set();
			await loadImages();
		}
	}

	onMount(() => {
		loadSavedFilters();
		void loadImages();
	});
</script>

<div class="max-w-7xl mx-auto">
	<div class="mb-6">
		<h1 class="text-lg font-semibold text-slate-900">R2 Images</h1>
		<p class="text-xs text-slate-500 mt-1">Browse and manage all images stored in R2</p>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap items-center gap-3 mb-4">
		<label class="flex items-center gap-1.5">
			<span class="text-[11px] font-medium text-slate-500">Format</span>
			<select
				bind:value={formatFilter}
				class="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
			>
				<option value="all">All</option>
				<option value="png">PNG</option>
				<option value="jpg">JPG</option>
				<option value="jpeg">JPEG</option>
				<option value="avif">AVIF</option>
				<option value="webp">WebP</option>
				<option value="gif">GIF</option>
			</select>
		</label>
		<label class="flex items-center gap-1.5">
			<span class="text-[11px] font-medium text-slate-500">Status</span>
			<select
				bind:value={statusFilter}
				class="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
			>
				<option value="all">All</option>
				<option value="optimized">Optimized</option>
				<option value="unoptimized">Unoptimized</option>
				<option value="orphan">Orphans</option>
			</select>
		</label>
		<label class="flex items-center gap-1.5">
			<span class="text-[11px] font-medium text-slate-500">Project</span>
			<select
				bind:value={projectFilter}
				class="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
			>
				<option value="all">All</option>
				{#each projects as [id, name]}
					<option value={id}>{name}</option>
				{/each}
			</select>
		</label>

		{#if hasNonDefaultFilters}
			<button
				type="button"
				onclick={resetFilters}
				class="text-[11px] text-slate-400 hover:text-slate-600 transition-colors duration-150"
			>
				Reset filters
			</button>
		{/if}

		{#if transformableItems.length > 0}
			<button
				type="button"
				disabled={transforming}
				onclick={transformSelected}
				class="ml-auto px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
			>
				{transforming ? 'Transforming...' : `Transform Selected (${transformableItems.length})`}
			</button>
		{/if}
	</div>

	<!-- Transform progress -->
	{#if transforming}
		<div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
			<div class="flex items-center justify-between text-xs text-slate-600 mb-2">
				<span>Transforming images...</span>
				<span>{transformProgress.done}/{transformProgress.total}{transformProgress.errors > 0 ? ` (${transformProgress.errors} errors)` : ''}</span>
			</div>
			<div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
				<div
					class="h-full bg-slate-900 rounded-full transition-all duration-300"
					style="width: {transformProgress.total > 0 ? (transformProgress.done / transformProgress.total) * 100 : 0}%"
				></div>
			</div>
		</div>
	{/if}

	<!-- Transform result -->
	{#if !transforming && transformResult}
		<div class="mb-4 rounded-lg border px-4 py-3 flex items-center justify-between {transformResult.errors === transformResult.total ? 'border-red-200 bg-red-50' : transformResult.errors > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}">
			<p class="text-xs {transformResult.errors === transformResult.total ? 'text-red-700' : transformResult.errors > 0 ? 'text-amber-700' : 'text-emerald-700'}">
				{transformResult.message}
			</p>
			<button
				type="button"
				class="text-[11px] text-slate-400 hover:text-slate-600 transition-colors duration-150"
				onclick={() => { transformResult = null; }}
			>
				Dismiss
			</button>
		</div>
	{/if}

	<!-- Table -->
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="flex items-center gap-2">
				<div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600"></div>
				<span class="text-sm text-slate-500">Loading images...</span>
			</div>
		</div>
	{:else if loadError}
		<div class="text-center py-20">
			<p class="text-sm text-red-600">{loadError}</p>
			<button type="button" onclick={loadImages} class="mt-2 text-xs text-slate-500 hover:text-slate-700 underline">Retry</button>
		</div>
	{:else if items.length === 0}
		<div class="text-center py-20">
			<p class="text-sm text-slate-500">No images in R2 yet.</p>
		</div>
	{:else}
		<div class="text-xs text-slate-400 mb-2">{filteredItems.length} of {items.length} images</div>
		<div class="border border-slate-200 rounded-xl overflow-hidden">
			<table class="w-full text-xs">
				<thead>
					<tr class="border-b border-slate-100 bg-slate-50">
						<th class="w-8 px-3 py-2.5 text-left">
							<input
								type="checkbox"
								checked={allSelected}
								onchange={toggleSelectAll}
								class="accent-slate-900 w-3 h-3"
							/>
						</th>
						<th class="w-12 px-2 py-2.5"></th>
						<th class="px-3 py-2.5 text-left font-medium text-slate-500">Key</th>
						<th class="px-3 py-2.5 text-left w-16">
							<button type="button" class="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-700 transition-colors" onclick={() => toggleSort('format')}>
								Format
								{#if sortField === 'format'}
									<svg class="w-3 h-3 {sortDir === 'desc' ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
								{:else}
									<svg class="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
								{/if}
							</button>
						</th>
						<th class="px-3 py-2.5 text-right w-20">
							<button type="button" class="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-700 transition-colors ml-auto" onclick={() => toggleSort('size')}>
								Size
								{#if sortField === 'size'}
									<svg class="w-3 h-3 {sortDir === 'desc' ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
								{:else}
									<svg class="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
								{/if}
							</button>
						</th>
						<th class="px-3 py-2.5 text-left w-28">
							<button type="button" class="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-700 transition-colors" onclick={() => toggleSort('project')}>
								Project
								{#if sortField === 'project'}
									<svg class="w-3 h-3 {sortDir === 'desc' ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
								{:else}
									<svg class="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
								{/if}
							</button>
						</th>
						<th class="px-3 py-2.5 text-left font-medium text-slate-500 w-20">Field</th>
						<th class="px-3 py-2.5 text-center font-medium text-slate-500 w-20">Status</th>
						<th class="px-3 py-2.5 text-left w-24">
							<button type="button" class="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-700 transition-colors" onclick={() => toggleSort('date')}>
								Uploaded
								{#if sortField === 'date'}
									<svg class="w-3 h-3 {sortDir === 'desc' ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
								{:else}
									<svg class="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
								{/if}
							</button>
						</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredItems as item (item.key)}
						<tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors duration-100">
							<td class="px-3 py-2">
								<input
									type="checkbox"
									checked={selectedKeys.has(item.key)}
									onchange={() => toggleSelect(item.key)}
									class="accent-slate-900 w-3 h-3"
								/>
							</td>
							<td class="px-2 py-2">
								<div class="w-8 h-8 rounded bg-slate-100 overflow-hidden">
									<img
										src={`/${item.key}`}
										alt=""
										class="w-full h-full object-cover"
										loading="lazy"
									/>
								</div>
							</td>
							<td class="px-3 py-2 font-mono text-slate-600 truncate max-w-[200px]" title={item.key}>
								{item.key.replace('artifacts/', '')}
							</td>
							<td class="px-3 py-2">
								<span class="inline-block rounded px-1.5 py-0.5 font-medium {item.isOptimized ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
									{getExtension(item.key)}
								</span>
							</td>
							<td class="px-3 py-2 text-right text-slate-500 tabular-nums">
								{formatSize(item.size)}
							</td>
							<td class="px-3 py-2 text-slate-600 truncate max-w-[120px]" title={item.projectName ?? item.settingLabel ?? ''}>
								{#if item.projectName}
									{item.projectName}
								{:else if item.settingLabel}
									<span class="text-violet-600">{item.settingLabel}</span>
								{:else}
									—
								{/if}
							</td>
							<td class="px-3 py-2 text-slate-400">
								{#if item.settingKey}
									namecard
								{:else if item.urlField === 'imageUrl'}
									primary
								{:else if item.urlField === 'hoverImageUrl'}
									hover
								{:else}
									—
								{/if}
							</td>
							<td class="px-3 py-2 text-center">
								{#if item.isOptimized}
									<span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" title="Optimized"></span>
								{:else if item.artifactId || item.settingKey}
									<span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" title="Unoptimized"></span>
								{:else}
									<span class="inline-block h-1.5 w-1.5 rounded-full bg-slate-300" title="Orphan"></span>
								{/if}
							</td>
							<td class="px-3 py-2 text-slate-400 tabular-nums">
								{formatDate(item.uploaded)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
