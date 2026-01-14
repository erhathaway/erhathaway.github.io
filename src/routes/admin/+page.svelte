<script lang="ts">
	import { UserButton, SignedOut } from 'svelte-clerk';

	let { data } = $props();
</script>

<div class="min-h-screen bg-cream text-walnut p-8">
	<div class="max-w-4xl mx-auto">
		<header class="flex justify-between items-center mb-8 pb-6 border-b border-walnut/10">
			<div>
				<h1 class="font-display text-4xl text-walnut mb-2">Admin Panel</h1>
				<p class="text-ash">Portfolio Management Dashboard</p>
			</div>
			<UserButton />
		</header>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<div class="bg-white rounded-lg p-6 shadow-sm border border-walnut/10">
				<h2 class="font-display text-xl text-walnut mb-3">Portfolio Items</h2>
				<p class="text-ash text-sm mb-4">Manage gallery items, descriptions, and metadata</p>
				<a href="/admin/projects" class="inline-block bg-copper text-cream px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity">
					Manage Items
				</a>
			</div>

			<div class="bg-white rounded-lg p-6 shadow-sm border border-walnut/10">
				<h2 class="font-display text-xl text-walnut mb-3">Categories</h2>
				<p class="text-ash text-sm mb-4">Add, edit, or remove portfolio categories</p>
				<button class="bg-copper text-cream px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity">
					Manage Categories
				</button>
			</div>

			<div class="bg-white rounded-lg p-6 shadow-sm border border-walnut/10">
				<h2 class="font-display text-xl text-walnut mb-3">Images</h2>
				<p class="text-ash text-sm mb-4">Upload and organize portfolio images</p>
				<button class="bg-copper text-cream px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity">
					Manage Images
				</button>
			</div>

			<div class="bg-white rounded-lg p-6 shadow-sm border border-walnut/10">
				<h2 class="font-display text-xl text-walnut mb-3">Settings</h2>
				<p class="text-ash text-sm mb-4">Site configuration and preferences</p>
				<button class="bg-copper text-cream px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity">
					View Settings
				</button>
			</div>

			<div class="bg-white rounded-lg p-6 shadow-sm border border-walnut/10">
				<h2 class="font-display text-xl text-walnut mb-3">Analytics</h2>
				<p class="text-ash text-sm mb-4">View site traffic and engagement metrics</p>
				<button class="bg-copper text-cream px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity">
					View Analytics
				</button>
			</div>

			<div class="bg-white rounded-lg p-6 shadow-sm border border-walnut/10">
				<h2 class="font-display text-xl text-walnut mb-3">Export</h2>
				<p class="text-ash text-sm mb-4">Export portfolio data and images</p>
				<button class="bg-copper text-cream px-4 py-2 rounded text-sm hover:opacity-90 transition-opacity">
					Export Data
				</button>
			</div>
		</div>

		<SignedOut>
			<div class="mt-8 p-4 bg-red-50 border border-red-200 rounded">
				<p class="text-red-700">You need to be signed in to access this page.</p>
			</div>
		</SignedOut>
	</div>
</div>