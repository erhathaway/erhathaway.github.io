<script lang="ts">
	import { useClerkContext, UserButton } from 'svelte-clerk';
	import { page } from '$app/stores';

	interface Props {
		onOpenModal: () => void;
	}

	let { onOpenModal }: Props = $props();

	const ctx = useClerkContext();
	const isSignedIn = $derived(ctx.auth.userId !== null);
	const isAdminPage = $derived($page.route.id?.includes('/admin'));

	async function handleSignOut() {
		await ctx.clerk.signOut();
	}
</script>

{#if isSignedIn}
	{#if isAdminPage}
		<div class="fixed top-4 right-4 flex items-center gap-3 z-50">
			<div class="bg-white rounded-full p-1 shadow-sm aspect-square flex items-center justify-center">
				<UserButton />
			</div>
			<button
				onclick={handleSignOut}
				class="text-[11px] tracking-[0.22em] uppercase text-ash/70 hover:text-copper transition-colors bg-white rounded-full px-3 py-1.5 shadow-sm"
			>
				Sign Out
			</button>
		</div>
	{:else}
		<a
			href="/admin"
			class="fixed top-4 right-4 text-[11px] tracking-[0.22em] uppercase text-ash/70 hover:text-copper transition-colors z-50"
		>
			Admin
		</a>
	{/if}
{:else}
	<button
		onclick={onOpenModal}
		class="fixed top-4 right-4 text-[11px] tracking-[0.22em] uppercase text-ash/70 hover:text-copper transition-colors z-50"
	>
		Admin
	</button>
{/if}