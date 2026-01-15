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


		<SignedOut>
			<div class="mt-8 p-4 bg-red-50 border border-red-200 rounded">
				<p class="text-red-700">You need to be signed in to access this page.</p>
			</div>
		</SignedOut>
	</div>
</div>