<script lang="ts">
	import { SignedIn, SignedOut, UserButton, useClerkContext } from 'svelte-clerk';
	import CategoryManager from './CategoryManager.svelte';
	import ProjectManager from './ProjectManager.svelte';
	import { adminStore } from '$lib/stores/admin.svelte';

	type Category = {
		id: number;
		name: string;
		displayName: string;
		isPublished: boolean;
	};

	const ctx = useClerkContext();

	const categories = $derived(adminStore.categories);
	const categoriesLoaded = $derived(adminStore.categoriesLoaded);

	async function getToken() {
		const clerk = ctx.clerk;
		const session = clerk?.session;
		if (!session) return null;
		return session.getToken();
	}

	function setCategories(next: Category[]) {
		adminStore.categories = next;
	}

	function setCategoriesLoaded(next: boolean) {
		adminStore.categoriesLoaded = next;
	}
</script>

<div class="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-walnut/10">
	<div>
		<h1 class="font-display text-4xl text-walnut mb-2">Admin Panel</h1>
		<p class="text-ash">Portfolio Management Dashboard</p>
	</div>
	<UserButton />
</div>

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
