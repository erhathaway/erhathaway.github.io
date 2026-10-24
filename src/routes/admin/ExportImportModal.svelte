<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ExportManifest, ConflictResolution } from '$lib/types/export-manifest';
	import type { AdminCategory, AdminProject } from '$lib/stores/admin.svelte';

	type Props = {
		open: boolean;
		categories: AdminCategory[];
		projects: AdminProject[];
		getToken: () => Promise<string | null>;
		onClose: () => void;
		onComplete: (message: string) => void;
	};

	let { open, categories, projects, getToken, onClose, onComplete }: Props = $props();

	let activeTab = $state<'export' | 'import'>('export');

	// --- Export state ---
	let selectedCategoryNames = $derived(new SvelteSet(categories.map((category) => category.name)));
	let selectedProjectNames = $derived(new SvelteSet(projects.map((project) => project.name)));
	let exportLoading = $state(false);
	let exportError = $state('');

	// --- Import state ---
	let importFile = $state<File | null>(null);
	let importManifest = $state<ExportManifest | null>(null);
	let importParsing = $state(false);
	let importLoading = $state(false);
	let importError = $state('');
	let defaultResolution = $state<ConflictResolution>('merge');
	let appearanceResolution = $state<ConflictResolution>('clobber');
	let perProjectResolution = $state<Record<string, ConflictResolution>>({});
	let perCategoryResolution = $state<Record<string, ConflictResolution>>({});
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let dragOver = $state(false);

	function storeFileInput(node: HTMLInputElement) {
		fileInputEl = node;
		return () => {
			fileInputEl = null;
		};
	}

	// Compute conflicts
	const conflicts = $derived.by(() => {
		if (!importManifest) return { categories: [] as string[], projects: [] as string[] };
		const existingCatNames = new Set(categories.map((c) => c.name));
		const existingProjNames = new Set(projects.map((p) => p.name));
		return {
			categories: importManifest.categories
				.filter((c) => existingCatNames.has(c.name))
				.map((c) => c.name),
			projects: importManifest.projects
				.filter((p) => existingProjNames.has(p.name))
				.map((p) => p.name)
		};
	});

	const hasConflicts = $derived(conflicts.categories.length > 0 || conflicts.projects.length > 0);

	// --- Export ---
	function toggleCategorySelection(name: string) {
		if (selectedCategoryNames.has(name)) selectedCategoryNames.delete(name);
		else selectedCategoryNames.add(name);
	}

	function toggleProjectSelection(name: string) {
		if (selectedProjectNames.has(name)) selectedProjectNames.delete(name);
		else selectedProjectNames.add(name);
	}

	function selectAllCategories() {
		selectedCategoryNames = new SvelteSet(categories.map((c) => c.name));
	}

	function deselectAllCategories() {
		selectedCategoryNames = new SvelteSet();
	}

	function selectAllProjects() {
		selectedProjectNames = new SvelteSet(projects.map((p) => p.name));
	}

	function deselectAllProjects() {
		selectedProjectNames = new SvelteSet();
	}

	async function handleExport() {
		exportLoading = true;
		exportError = '';
		try {
			const token = await getToken();
			if (!token) throw new Error('Sign in to export.');

			const response = await fetch('/api/admin/export', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					categoryNames: [...selectedCategoryNames],
					projectNames: [...selectedProjectNames]
				})
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({ message: 'Export failed.' }));
				throw new Error(err.message || 'Export failed.');
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `portfolio-export-${Date.now()}.zip`;
			a.click();
			URL.revokeObjectURL(url);

			onComplete('Export downloaded successfully.');
		} catch (err) {
			exportError = err instanceof Error ? err.message : 'Export failed.';
		} finally {
			exportLoading = false;
		}
	}

	// --- Import ---
	async function parseZipFile(file: File) {
		importFile = file;
		importParsing = true;
		importError = '';
		importManifest = null;
		perProjectResolution = {};
		perCategoryResolution = {};
		try {
			const JSZip = (await import('jszip')).default;
			const zip = await JSZip.loadAsync(await file.arrayBuffer());
			const manifestFile = zip.file('manifest-with-hashes.json') ?? zip.file('manifest.json');
			if (!manifestFile) throw new Error('Invalid package: no manifest.json found.');
			const parsed = JSON.parse(await manifestFile.async('text'));
			if (parsed.version !== 1 && parsed.version !== 2)
				throw new Error(`Unsupported manifest version: ${parsed.version}`);
			importManifest = parsed as ExportManifest;
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Failed to parse ZIP.';
			importManifest = null;
		} finally {
			importParsing = false;
		}
	}

	function handleFileDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const file = event.dataTransfer?.files[0];
		if (file && file.name.endsWith('.zip')) {
			void parseZipFile(file);
		} else {
			importError = 'Please drop a .zip file.';
		}
	}

	function handleFileInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			void parseZipFile(file);
		}
	}

	function clearFile() {
		importFile = null;
		importManifest = null;
		importError = '';
		perProjectResolution = {};
		perCategoryResolution = {};
	}

	function getResolution(type: 'project' | 'category', name: string): ConflictResolution {
		if (type === 'project') return perProjectResolution[name] ?? defaultResolution;
		return perCategoryResolution[name] ?? defaultResolution;
	}

	function setResolution(type: 'project' | 'category', name: string, value: ConflictResolution) {
		if (type === 'project') {
			perProjectResolution = { ...perProjectResolution, [name]: value };
		} else {
			perCategoryResolution = { ...perCategoryResolution, [name]: value };
		}
	}

	async function handleImport() {
		if (!importFile || !importManifest) return;
		importLoading = true;
		importError = '';
		try {
			const token = await getToken();
			if (!token) throw new Error('Sign in to import.');

			const formData = new FormData();
			formData.append('file', importFile);
			formData.append(
				'conflicts',
				JSON.stringify({
					defaultResolution,
					appearanceResolution,
					perProject: perProjectResolution,
					perCategory: perCategoryResolution
				})
			);

			const response = await fetch('/api/admin/import', {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: formData
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({ message: 'Import failed.' }));
				throw new Error(err.message || 'Import failed.');
			}

			const result = await response.json();
			const s = result.summary;
			await invalidateAll();
			const parts: string[] = [];
			if (s.appearanceSettingsRestored)
				parts.push(`${s.appearanceSettingsRestored} theme/name-card settings restored`);
			if (s.projectsCreated) parts.push(`${s.projectsCreated} created`);
			if (s.projectsMerged) parts.push(`${s.projectsMerged} merged`);
			if (s.projectsClobbered) parts.push(`${s.projectsClobbered} replaced`);
			if (s.projectsSkipped) parts.push(`${s.projectsSkipped} skipped`);

			const artifactParts: string[] = [];
			if (s.artifactsCreated) artifactParts.push(`${s.artifactsCreated} new`);
			if (s.artifactsSkipped) artifactParts.push(`${s.artifactsSkipped} existing`);
			const artifactDetail =
				artifactParts.length > 0 ? ` (${artifactParts.join(', ')} artifacts)` : '';

			onComplete(`Import complete: ${parts.join(', ') || 'no changes'}${artifactDetail}.`);
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Import failed.';
		} finally {
			importLoading = false;
		}
	}

	const resolutionOptions: { value: ConflictResolution; label: string }[] = [
		{ value: 'merge', label: 'Merge' },
		{ value: 'clobber', label: 'Replace' },
		{ value: 'skip', label: 'Skip' }
	];
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			aria-label="Close modal"
			onclick={onClose}
		></button>
		<div
			class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
		>
			<!-- Header -->
			<div
				class="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 pt-5 pb-4"
			>
				<h3 class="text-base font-semibold text-slate-900">Export / Import</h3>
				<button
					type="button"
					class="rounded-xl p-1.5 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600"
					aria-label="Close modal"
					onclick={onClose}
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Tabs -->
			<div class="flex shrink-0 border-b border-slate-100 px-6">
				<button
					type="button"
					class="-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 {activeTab ===
					'export'
						? 'border-slate-900 text-slate-900'
						: 'border-transparent text-slate-400 hover:text-slate-600'}"
					onclick={() => (activeTab = 'export')}
				>
					Export
				</button>
				<button
					type="button"
					class="-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 {activeTab ===
					'import'
						? 'border-slate-900 text-slate-900'
						: 'border-transparent text-slate-400 hover:text-slate-600'}"
					onclick={() => (activeTab = 'import')}
				>
					Import
				</button>
			</div>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto px-6 py-5">
				{#if activeTab === 'export'}
					<!-- Export Tab -->
					<div class="space-y-5">
						<p class="text-xs text-slate-500">
							Every export includes all saved typography themes, the active theme, name-card
							variants, generator recipes, backgrounds, and landing/project/preview promotions with
							their images.
						</p>
						<!-- Categories -->
						<div>
							<div class="mb-2 flex items-center justify-between">
								<p class="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
									Categories
								</p>
								<div class="flex gap-2">
									<button
										type="button"
										onclick={selectAllCategories}
										class="text-[11px] text-slate-400 transition-colors hover:text-slate-600"
										>All</button
									>
									<span class="text-[11px] text-slate-300">/</span>
									<button
										type="button"
										onclick={deselectAllCategories}
										class="text-[11px] text-slate-400 transition-colors hover:text-slate-600"
										>None</button
									>
								</div>
							</div>
							{#if categories.length === 0}
								<p class="text-xs text-slate-400">No categories.</p>
							{:else}
								<div class="grid gap-1">
									{#each categories as cat (cat.id)}
										<label
											class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 transition-colors duration-150 hover:bg-slate-50"
										>
											<input
												type="checkbox"
												checked={selectedCategoryNames.has(cat.name)}
												onchange={() => toggleCategorySelection(cat.name)}
												class="h-3.5 w-3.5 accent-slate-900"
											/>
											<span class="font-medium">{cat.displayName || cat.name}</span>
											<span class="ml-auto font-mono text-[10px] text-slate-400">/{cat.name}</span>
										</label>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Projects -->
						<div>
							<div class="mb-2 flex items-center justify-between">
								<p class="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
									Projects
								</p>
								<div class="flex gap-2">
									<button
										type="button"
										onclick={selectAllProjects}
										class="text-[11px] text-slate-400 transition-colors hover:text-slate-600"
										>All</button
									>
									<span class="text-[11px] text-slate-300">/</span>
									<button
										type="button"
										onclick={deselectAllProjects}
										class="text-[11px] text-slate-400 transition-colors hover:text-slate-600"
										>None</button
									>
								</div>
							</div>
							{#if projects.length === 0}
								<p class="text-xs text-slate-400">No projects.</p>
							{:else}
								<div class="grid gap-1">
									{#each projects as proj (proj.id)}
										<label
											class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 transition-colors duration-150 hover:bg-slate-50"
										>
											<input
												type="checkbox"
												checked={selectedProjectNames.has(proj.name)}
												onchange={() => toggleProjectSelection(proj.name)}
												class="h-3.5 w-3.5 accent-slate-900"
											/>
											<span class="font-medium">{proj.displayName || proj.name}</span>
											<span class="ml-auto font-mono text-[10px] text-slate-400">/{proj.name}</span>
										</label>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<!-- Import Tab -->
					<div class="space-y-5">
						{#if !importFile}
							<!-- Drop zone -->
							<div
								class="rounded-xl border-2 border-dashed p-10 text-center transition-colors duration-150 {dragOver
									? 'border-slate-400 bg-slate-50'
									: 'border-slate-200'}"
								ondragover={(e) => {
									e.preventDefault();
									dragOver = true;
								}}
								ondragleave={() => (dragOver = false)}
								ondrop={handleFileDrop}
								role="button"
								tabindex="0"
								onclick={() => fileInputEl?.click()}
								onkeydown={(e) => {
									if (e.key === 'Enter') fileInputEl?.click();
								}}
							>
								<svg
									class="mx-auto mb-3 h-8 w-8 text-slate-300"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									/>
								</svg>
								<p class="mb-1 text-sm text-slate-500">Drop a .zip export here</p>
								<p class="text-xs text-slate-400">or click to browse</p>
								<input
									{@attach storeFileInput}
									type="file"
									accept=".zip"
									class="hidden"
									onchange={handleFileInput}
								/>
							</div>
						{:else}
							<!-- File loaded -->
							<div
								class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3"
							>
								<div class="flex items-center gap-2.5">
									<svg
										class="h-4 w-4 text-slate-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
									<span class="text-xs font-medium text-slate-700">{importFile.name}</span>
								</div>
								<button
									type="button"
									onclick={clearFile}
									class="text-xs text-slate-400 transition-colors hover:text-slate-600"
									>Change</button
								>
							</div>

							{#if importParsing}
								<p class="text-xs text-slate-400">Parsing...</p>
							{:else if importManifest}
								<!-- Summary -->
								<div class="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
									<p class="text-xs text-slate-500">
										<span class="font-medium text-slate-700"
											>{importManifest.categories.length}</span
										>
										categories,
										<span class="font-medium text-slate-700">{importManifest.projects.length}</span>
										projects,
										<span class="font-medium text-slate-700"
											>{importManifest.projects.reduce((n, p) => n + p.artifacts.length, 0)}</span
										> artifacts
									</p>
									<p class="mt-1 text-[10px] text-slate-400">
										Exported {new Date(importManifest.exportedAt).toLocaleString()}
									</p>
								</div>

								{#if importManifest.appearance}
									<div class="rounded-xl border border-slate-200 px-4 py-3">
										<label class="text-xs font-medium text-slate-700"
											>Themes and name cards
											<select
												bind:value={appearanceResolution}
												class="mt-2 block w-full rounded-lg border border-slate-200 p-2 text-xs"
											>
												<option value="clobber">Replace with backup</option>
												<option value="merge">Merge saved themes and cards</option>
												<option value="skip">Keep current themes and cards</option>
											</select>
										</label>
										<p class="mt-2 text-xs text-slate-500">
											{importManifest.appearance.settings.filter((row) =>
												row.key.startsWith('typography-theme:')
											).length} saved themes and {importManifest.appearance.settings.filter((row) =>
												row.key.startsWith('namecard-variant:')
											).length} name-card variants, plus active selections and images.
										</p>
										<p class="mt-2 text-xs text-slate-500">
											{appearanceResolution === 'clobber'
												? 'Restores the exact appearance library and promotions. Existing themes and variants absent from the backup are removed.'
												: appearanceResolution === 'merge'
													? 'Updates matching IDs, adds saved entries, and restores the backed-up active selections. Other entries remain.'
													: 'Leaves all current appearance settings unchanged.'}
										</p>
									</div>
								{:else}<p class="text-xs text-slate-500">
										Legacy backup: only the included name-card images will be restored. Typography
										themes and saved variants are unchanged.
									</p>{/if}
								<!-- Conflicts -->
								{#if hasConflicts}
									<div class="space-y-3">
										<div>
											<p
												class="mb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase"
											>
												Conflict Resolution
											</p>
											<p class="mb-3 text-xs text-slate-500">
												{conflicts.categories.length + conflicts.projects.length} items already exist.
												Choose how to handle them:
											</p>

											<!-- Default resolution -->
											<div class="mb-4 flex items-center gap-3">
												<span class="text-xs text-slate-500">Default:</span>
												<div class="flex overflow-hidden rounded-lg border border-slate-200">
													{#each resolutionOptions as opt (opt.value)}
														<button
															type="button"
															onclick={() => (defaultResolution = opt.value)}
															class="px-3 py-1.5 text-xs font-medium transition-colors duration-150 {defaultResolution ===
															opt.value
																? 'bg-slate-900 text-white'
																: 'text-slate-500 hover:bg-slate-50'}"
														>
															{opt.label}
														</button>
													{/each}
												</div>
											</div>

											<!-- Per-item overrides -->
											{#if conflicts.categories.length > 0}
												<p
													class="mb-1.5 text-[10px] font-semibold tracking-widest text-slate-400 uppercase"
												>
													Categories
												</p>
												<div class="mb-3 grid gap-1">
													{#each conflicts.categories as name (name)}
														<div
															class="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-slate-50"
														>
															<span class="text-xs font-medium text-slate-600">{name}</span>
															<div class="flex overflow-hidden rounded-md border border-slate-200">
																{#each resolutionOptions as opt (opt.value)}
																	<button
																		type="button"
																		onclick={() => setResolution('category', name, opt.value)}
																		class="px-2 py-1 text-[10px] font-medium transition-colors duration-150 {getResolution(
																			'category',
																			name
																		) === opt.value
																			? 'bg-slate-800 text-white'
																			: 'text-slate-400 hover:bg-slate-50'}"
																	>
																		{opt.label}
																	</button>
																{/each}
															</div>
														</div>
													{/each}
												</div>
											{/if}

											{#if conflicts.projects.length > 0}
												<p
													class="mb-1.5 text-[10px] font-semibold tracking-widest text-slate-400 uppercase"
												>
													Projects
												</p>
												<div class="grid gap-1">
													{#each conflicts.projects as name (name)}
														<div
															class="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-slate-50"
														>
															<span class="text-xs font-medium text-slate-600">{name}</span>
															<div class="flex overflow-hidden rounded-md border border-slate-200">
																{#each resolutionOptions as opt (opt.value)}
																	<button
																		type="button"
																		onclick={() => setResolution('project', name, opt.value)}
																		class="px-2 py-1 text-[10px] font-medium transition-colors duration-150 {getResolution(
																			'project',
																			name
																		) === opt.value
																			? 'bg-slate-800 text-white'
																			: 'text-slate-400 hover:bg-slate-50'}"
																	>
																		{opt.label}
																	</button>
																{/each}
															</div>
														</div>
													{/each}
												</div>
											{/if}
										</div>
									</div>
								{:else}
									<div class="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
										<p class="text-xs text-emerald-700">No conflicts found. All items are new.</p>
									</div>
								{/if}
							{/if}
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex shrink-0 items-center gap-2.5 border-t border-slate-100 px-6 py-4">
				{#if activeTab === 'export'}
					<button
						type="button"
						onclick={handleExport}
						disabled={exportLoading ||
							(selectedCategoryNames.size === 0 && selectedProjectNames.size === 0)}
						class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
					>
						{exportLoading ? 'Exporting...' : 'Export'}
					</button>
					{#if exportError}
						<p class="text-xs text-red-600">{exportError}</p>
					{/if}
				{:else}
					<button
						type="button"
						onclick={handleImport}
						disabled={importLoading || !importManifest}
						class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
					>
						{importLoading ? 'Importing...' : 'Import'}
					</button>
					{#if importError}
						<p class="text-xs text-red-600">{importError}</p>
					{/if}
				{/if}
				<button
					type="button"
					onclick={onClose}
					class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
