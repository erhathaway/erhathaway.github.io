<script lang="ts">
	import { useClerkContext } from 'svelte-clerk';
	import { goto } from '$app/navigation';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen = $bindable(), onClose }: Props = $props();

	const ctx = useClerkContext();

	let email = $state('');
	let code = $state('');
	let showCodeInput = $state(false);
	let isLoading = $state(false);
	let error = $state('');

	async function handleEmailSubmit(e: Event) {
		e.preventDefault();
		error = '';
		isLoading = true;

		try {
			const clerk = ctx.clerk;
			const client = clerk.client;

			// Create a sign-in attempt with email
			const signInAttempt = await client.signIn.create({
				identifier: email,
				strategy: 'email_code'
			});

			// Prepare the email code
			await signInAttempt.prepareFirstFactor({
				strategy: 'email_code',
				emailAddressId: signInAttempt.supportedFirstFactors?.find(
					(f: any) => f.strategy === 'email_code'
				)?.emailAddressId
			});

			showCodeInput = true;
		} catch (err: any) {
			console.error('Error sending code:', err);
			if (err?.errors?.[0]?.code === 'form_identifier_not_found') {
				error = 'Email not found. Please check and try again.';
			} else {
				error = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Failed to send code. Please try again.';
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleCodeSubmit(e: Event) {
		e.preventDefault();
		error = '';
		isLoading = true;

		try {
			const clerk = ctx.clerk;
			const client = clerk.client;

			// Get the current sign-in attempt
			const signInAttempt = client.signIn;

			// Attempt to verify the code
			const result = await signInAttempt.attemptFirstFactor({
				strategy: 'email_code',
				code: code
			});

			if (result.status === 'complete') {
				// Set active session
				await clerk.setActive({ session: result.createdSessionId });
				// Navigate to admin
				await goto('/admin');
				onClose();
			} else {
				error = 'Unable to sign in. Please try again.';
			}
		} catch (err: any) {
			console.error('Error verifying code:', err);
			error = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Invalid code. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isLoading) {
			onClose();
			resetState();
		}
	}

	function resetState() {
		email = '';
		code = '';
		showCodeInput = false;
		error = '';
		isLoading = false;
	}

	function goBack() {
		showCodeInput = false;
		code = '';
		error = '';
	}

	// Reset state when modal opens/closes
	$effect(() => {
		if (!isOpen) {
			resetState();
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div class="fixed inset-0 z-[100] animate-fade-in">
		<!-- Frosted glass background overlay -->
		<div class="absolute inset-0 bg-white/30 backdrop-blur-xl"></div>

		<!-- White center that fades to transparent -->
		<div class="absolute inset-0 bg-gradient-radial from-white via-white/95 to-transparent"></div>

		<button
			onclick={onClose}
			class="absolute top-8 left-8 text-walnut/50 hover:text-walnut transition-colors p-3 z-10 bg-white/50 rounded-full border-0 outline-none"
			aria-label="Close"
		>
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M8 8L24 24M24 8L8 24" stroke="currentColor" stroke-width="2"/>
			</svg>
		</button>

		<div class="relative flex items-center justify-center h-full">
			<div class="w-full max-w-sm px-4">
				<h1 class="font-sans font-light text-5xl mb-12 text-walnut text-center tracking-wide">Admin</h1>

				{#if !showCodeInput}
					<form onsubmit={handleEmailSubmit} class="space-y-6">
						<div>
							<input
								id="email"
								type="email"
								bind:value={email}
								required
								disabled={isLoading}
								class="w-full px-4 py-3 bg-white/50 border border-gray-300 rounded-md text-walnut placeholder-ash/60 focus:outline-none focus:border-copper transition-colors font-sans disabled:opacity-50"
								placeholder="Email"
								autofocus
							/>
						</div>

						{#if error}
							<p class="text-red-600 text-sm text-center">{error}</p>
						{/if}

						<button
							type="submit"
							disabled={isLoading}
							class="w-full py-3 bg-walnut text-cream font-sans hover:bg-copper transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? 'Sending...' : 'Continue'}
						</button>
					</form>
				{:else}
					<form onsubmit={handleCodeSubmit} class="space-y-6">
						<p class="text-center text-ash/80 text-sm mb-4">Enter the code sent to {email}</p>

						<div>
							<input
								id="code"
								type="text"
								bind:value={code}
								required
								disabled={isLoading}
								class="w-full px-4 py-3 bg-white/50 border border-gray-300 rounded-md text-walnut placeholder-ash/60 focus:outline-none focus:border-copper transition-colors font-sans text-center tracking-widest disabled:opacity-50"
								placeholder="000000"
								maxlength="6"
								autofocus
							/>
						</div>

						{#if error}
							<p class="text-red-600 text-sm text-center">{error}</p>
						{/if}

						<button
							type="submit"
							disabled={isLoading}
							class="w-full py-3 bg-walnut text-cream font-sans hover:bg-copper transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? 'Verifying...' : 'Sign In'}
						</button>

						<button
							type="button"
							onclick={goBack}
							disabled={isLoading}
							class="w-full text-center text-ash/60 hover:text-ash text-sm font-sans disabled:opacity-50"
						>
							Use a different email
						</button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.animate-fade-in {
		animation: fade-in 0.2s ease-out;
	}

	.bg-gradient-radial {
		background: radial-gradient(circle at center, white 0%, white 30%, rgba(255, 255, 255, 0.95) 50%, transparent 80%);
	}
</style>