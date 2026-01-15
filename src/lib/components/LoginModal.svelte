<script lang="ts">
	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen = $bindable(), onClose }: Props = $props();

	let email = $state('');
	let password = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		window.location.href = '/admin/sign-in';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
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

				<form onsubmit={handleSubmit} class="space-y-6">
					<div>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							class="w-full px-4 py-3 bg-white/50 border border-gray-300 rounded-md text-walnut placeholder-ash/60 focus:outline-none focus:border-copper transition-colors font-sans"
							placeholder="Email"
						/>
					</div>

					<div>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							class="w-full px-4 py-3 bg-white/50 border border-gray-300 rounded-md text-walnut placeholder-ash/60 focus:outline-none focus:border-copper transition-colors font-sans"
							placeholder="Password"
						/>
					</div>

					<button
						type="submit"
						class="w-full py-3 bg-walnut text-cream font-sans hover:bg-copper transition-colors rounded-md"
					>
						Sign In
					</button>
				</form>
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