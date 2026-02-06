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

{#snippet letterReveal(text: string, baseDelay: number)}
	{#each text.split('') as char, i}
		<span class="auth-letter" style="animation-delay: {baseDelay + i * 0.03}s">{char}</span>
	{/each}
{/snippet}

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
				{@render letterReveal('Sign Out', 0.8)}
			</button>
		</div>
	{:else}
		<a
			href="/admin"
			class="fixed top-4 right-4 text-[11px] tracking-[0.22em] uppercase text-ash/70 hover:text-copper transition-colors z-50"
		>
			{@render letterReveal('Admin', 0.8)}
		</a>
	{/if}
{:else}
	<button
		onclick={onOpenModal}
		class="fixed top-4 right-4 text-[11px] tracking-[0.22em] uppercase text-ash/70 hover:text-copper transition-colors z-50"
	>
		{@render letterReveal('Admin', 0.8)}
	</button>
{/if}

<style>
	.auth-letter {
		display: inline-block;
		opacity: 0;
		animation: letterIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes letterIn {
		from {
			opacity: 0;
			transform: translateY(4px);
			filter: blur(2px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
			filter: blur(0);
		}
	}
</style>