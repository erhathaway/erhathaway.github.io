<script lang="ts">
	import { useClerkContext } from 'svelte-clerk';
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
		<button
			onclick={handleSignOut}
			class="fixed top-4 right-4 text-[11px] tracking-[0.22em] uppercase text-ash/70 hover:text-copper transition-colors z-50"
		>
			Sign Out
		</button>
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