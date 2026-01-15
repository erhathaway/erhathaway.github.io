<script lang="ts">
	import { SignedIn, SignedOut, UserButton, useClerkContext } from 'svelte-clerk';
	import CategoryManager from './CategoryManager.svelte';
	import ProjectManager from './ProjectManager.svelte';

	type Category = {
		id: number;
		name: string;
		displayName: string;
		isPublished: boolean;
	};

	const ctx = useClerkContext();

	let categories = $state<Category[]>([]);
	let categoriesLoaded = $state(false);

	async function getToken() {
		const clerk = ctx.clerk;
		const session = clerk?.session;
		if (!session) return null;
		return session.getToken();
	}

	function setCategories(next: Category[]) {
		categories = next;
	}

	function setCategoriesLoaded(next: boolean) {
		categoriesLoaded = next;
	}
</script>

<div class="h-screen bg-cream text-walnut p-8 pb-16">
	<div class="max-w-5xl mx-auto h-full overflow-y-auto pr-2">
		<header class="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-walnut/10">
			<div>
				<h1 class="font-display text-4xl text-walnut mb-2">Admin Panel</h1>
				<p class="text-ash">Portfolio Management Dashboard</p>
			</div>
			<UserButton />
		</header>

		<SignedIn>
			<CategoryManager
				{categories}
				{categoriesLoaded}
				{getToken}
				{setCategories}
				{setCategoriesLoaded}
			/>
			<ProjectManager {categories} {categoriesLoaded} {getToken} />
		</SignedIn>

		<SignedOut>
			<div class="mt-8 p-4 bg-red-50 border border-red-200 rounded">
				<p class="text-red-700">You need to be signed in to access this page.</p>
			</div>
		</SignedOut>
	</div>
</div>
