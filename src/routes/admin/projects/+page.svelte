<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { useAuth } from 'svelte-clerk';

	interface Project {
		id?: number;
		name: string;
		category: 'wood' | 'food' | 'other';
		subcategory: string;
		description: string;
		metadata: Record<string, string>;
		image?: string;
		gridSize?: 'regular' | 'wide' | 'tall' | 'featured';
		isPublic: boolean;
	}

	const auth = useAuth();
	let projects: Project[] = $state([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingProject = $state<Project | null>(null);
	let formData = $state<Project>({
		name: '',
		category: 'wood',
		subcategory: '',
		description: '',
		metadata: {},
		image: '',
		gridSize: 'regular',
		isPublic: false
	});

	const API_BASE = 'https://portfolio-api.ambleim.workers.dev/api';

	async function fetchProjects() {
		try {
			const token = await auth.getToken();
			const response = await fetch(`${API_BASE}/projects`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {}
			});

			if (response.ok) {
				projects = await response.json();
			} else {
				console.error('Failed to fetch projects');
			}
		} catch (error) {
			console.error('Error fetching projects:', error);
		} finally {
			loading = false;
		}
	}

	async function saveProject() {
		try {
			const token = await auth.getToken();
			const url = editingProject
				? `${API_BASE}/projects/${editingProject.id}`
				: `${API_BASE}/projects`;

			const response = await fetch(url, {
				method: editingProject ? 'PUT' : 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(formData)
			});

			if (response.ok) {
				await fetchProjects();
				resetForm();
			} else {
				console.error('Failed to save project');
			}
		} catch (error) {
			console.error('Error saving project:', error);
		}
	}

	async function deleteProject(project: Project) {
		if (!confirm(`Are you sure you want to delete "${project.name}"?`)) return;

		try {
			const token = await auth.getToken();
			const response = await fetch(`${API_BASE}/projects/${project.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});

			if (response.ok) {
				await fetchProjects();
			} else {
				console.error('Failed to delete project');
			}
		} catch (error) {
			console.error('Error deleting project:', error);
		}
	}

	function editProject(project: Project) {
		editingProject = project;
		formData = { ...project };
		showForm = true;
	}

	function resetForm() {
		formData = {
			name: '',
			category: 'wood',
			subcategory: '',
			description: '',
			metadata: {},
			image: '',
			gridSize: 'regular',
			isPublic: false
		};
		editingProject = null;
		showForm = false;
	}

	function addMetadata(key: string, value: string) {
		if (key && value) {
			formData.metadata = { ...formData.metadata, [key]: value };
		}
	}

	function removeMetadata(key: string) {
		const newMetadata = { ...formData.metadata };
		delete newMetadata[key];
		formData.metadata = newMetadata;
	}

	onMount(() => {
		fetchProjects();
	});
</script>

<div class="min-h-screen bg-cream text-walnut p-8">
	<div class="max-w-6xl mx-auto">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="font-display text-4xl text-walnut mb-2">Project Management</h1>
				<p class="text-ash">Manage portfolio items and their visibility</p>
			</div>
			<button
				onclick={() => { showForm = true; }}
				class="bg-copper text-cream px-6 py-3 rounded hover:opacity-90 transition-opacity"
			>
				Add Project
			</button>
		</div>

		{#if loading}
			<div class="text-center py-12">
				<p class="text-ash">Loading projects...</p>
			</div>
		{:else}
			<!-- Projects List -->
			<div class="bg-white rounded-lg shadow-sm border border-walnut/10 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-walnut/5">
							<tr>
								<th class="text-left p-4 font-display">Name</th>
								<th class="text-left p-4 font-display">Category</th>
								<th class="text-left p-4 font-display">Status</th>
								<th class="text-left p-4 font-display">Grid Size</th>
								<th class="text-right p-4 font-display">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each projects as project}
								<tr class="border-t border-walnut/5">
									<td class="p-4">
										<div>
											<p class="font-medium text-walnut">{project.name}</p>
											<p class="text-sm text-ash">{project.subcategory}</p>
										</div>
									</td>
									<td class="p-4">
										<span class="inline-block px-2 py-1 bg-ash/10 rounded text-sm text-walnut capitalize">
											{project.category}
										</span>
									</td>
									<td class="p-4">
										<span class="inline-block px-2 py-1 rounded text-sm {project.isPublic ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
											{project.isPublic ? 'Public' : 'Private'}
										</span>
									</td>
									<td class="p-4 text-ash text-sm capitalize">{project.gridSize}</td>
									<td class="p-4">
										<div class="flex gap-2 justify-end">
											<button
												onclick={() => editProject(project)}
												class="text-copper hover:text-copper/80 text-sm"
											>
												Edit
											</button>
											<button
												onclick={() => deleteProject(project)}
												class="text-red-600 hover:text-red-800 text-sm"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- Project Form Modal -->
		{#if showForm}
			<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
				<div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
					<div class="p-6">
						<h2 class="font-display text-2xl text-walnut mb-6">
							{editingProject ? 'Edit Project' : 'Add New Project'}
						</h2>

						<form onsubmit={(e) => { e.preventDefault(); saveProject(); }}>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
								<div>
									<label class="block text-sm font-medium text-walnut mb-2">Name</label>
									<input
										bind:value={formData.name}
										type="text"
										required
										class="w-full border border-walnut/20 rounded px-3 py-2 focus:outline-none focus:border-copper"
									>
								</div>

								<div>
									<label class="block text-sm font-medium text-walnut mb-2">Category</label>
									<select
										bind:value={formData.category}
										class="w-full border border-walnut/20 rounded px-3 py-2 focus:outline-none focus:border-copper"
									>
										<option value="wood">Wood</option>
										<option value="food">Food</option>
										<option value="other">Other</option>
									</select>
								</div>

								<div>
									<label class="block text-sm font-medium text-walnut mb-2">Subcategory</label>
									<input
										bind:value={formData.subcategory}
										type="text"
										required
										class="w-full border border-walnut/20 rounded px-3 py-2 focus:outline-none focus:border-copper"
									>
								</div>

								<div>
									<label class="block text-sm font-medium text-walnut mb-2">Grid Size</label>
									<select
										bind:value={formData.gridSize}
										class="w-full border border-walnut/20 rounded px-3 py-2 focus:outline-none focus:border-copper"
									>
										<option value="regular">Regular</option>
										<option value="wide">Wide</option>
										<option value="tall">Tall</option>
										<option value="featured">Featured</option>
									</select>
								</div>
							</div>

							<div class="mb-4">
								<label class="block text-sm font-medium text-walnut mb-2">Description</label>
								<textarea
									bind:value={formData.description}
									required
									rows="3"
									class="w-full border border-walnut/20 rounded px-3 py-2 focus:outline-none focus:border-copper"
								></textarea>
							</div>

							<div class="mb-4">
								<label class="block text-sm font-medium text-walnut mb-2">Image URL</label>
								<input
									bind:value={formData.image}
									type="url"
									class="w-full border border-walnut/20 rounded px-3 py-2 focus:outline-none focus:border-copper"
								>
							</div>

							<div class="mb-4">
								<label class="flex items-center">
									<input
										bind:checked={formData.isPublic}
										type="checkbox"
										class="mr-2"
									>
									<span class="text-sm text-walnut">Make this project public</span>
								</label>
							</div>

							<!-- Metadata Section -->
							<div class="mb-6">
								<h3 class="text-sm font-medium text-walnut mb-3">Metadata</h3>
								<div class="space-y-2">
									{#each Object.entries(formData.metadata) as [key, value]}
										<div class="flex gap-2">
											<input
												value={key}
												readonly
												class="flex-1 border border-walnut/20 rounded px-3 py-2 bg-gray-50"
											>
											<input
												value={value}
												onchange={(e) => formData.metadata[key] = e.currentTarget.value}
												class="flex-1 border border-walnut/20 rounded px-3 py-2 focus:outline-none focus:border-copper"
											>
											<button
												type="button"
												onclick={() => removeMetadata(key)}
												class="text-red-600 hover:text-red-800 px-2"
											>
												Remove
											</button>
										</div>
									{/each}
									<div class="flex gap-2">
										<input
											id="newMetaKey"
											placeholder="Key"
											class="flex-1 border border-walnut/20 rounded px-3 py-2 focus:outline-none focus:border-copper"
										>
										<input
											id="newMetaValue"
											placeholder="Value"
											class="flex-1 border border-walnut/20 rounded px-3 py-2 focus:outline-none focus:border-copper"
										>
										<button
											type="button"
											onclick={() => {
												const keyInput = document.getElementById('newMetaKey') as HTMLInputElement;
												const valueInput = document.getElementById('newMetaValue') as HTMLInputElement;
												if (keyInput.value && valueInput.value) {
													addMetadata(keyInput.value, valueInput.value);
													keyInput.value = '';
													valueInput.value = '';
												}
											}}
											class="text-copper hover:text-copper/80 px-2"
										>
											Add
										</button>
									</div>
								</div>
							</div>

							<div class="flex gap-3">
								<button
									type="submit"
									class="bg-copper text-cream px-6 py-2 rounded hover:opacity-90 transition-opacity"
								>
									{editingProject ? 'Update' : 'Create'} Project
								</button>
								<button
									type="button"
									onclick={resetForm}
									class="border border-walnut/20 text-walnut px-6 py-2 rounded hover:bg-walnut/5 transition-colors"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>