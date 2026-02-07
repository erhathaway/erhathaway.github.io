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
	let emailTouched = $state(false);
	let sendingState = $state<'idle' | 'sending' | 'sent'>('idle');

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const isEmailValid = $derived(emailRegex.test(email.trim()));
	const showEmailError = $derived(emailTouched && email.trim().length > 0 && !isEmailValid);
	const canSubmitEmail = $derived(isEmailValid && !isLoading);
	const canSubmitCode = $derived(code.trim().length > 0 && !isLoading);

	async function handleEmailSubmit(e: Event) {
		e.preventDefault();
		if (!canSubmitEmail) return;
		error = '';
		isLoading = true;
		sendingState = 'sending';

		try {
			const clerk = ctx.clerk;
			const client = clerk.client;

			await client.signIn.create({
				identifier: email,
				strategy: 'email_code'
			});

			sendingState = 'sent';
			await new Promise(r => setTimeout(r, 600));
			showCodeInput = true;
			sendingState = 'idle';
		} catch (err: any) {
			console.error('Error sending code:', err);
			sendingState = 'idle';
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
		if (!canSubmitCode) return;
		error = '';
		isLoading = true;

		try {
			const clerk = ctx.clerk;
			const client = clerk.client;

			const signInAttempt = client.signIn;

			const result = await signInAttempt.attemptFirstFactor({
				strategy: 'email_code',
				code: code
			});

			if (result.status === 'complete') {
				await clerk.setActive({ session: result.createdSessionId });
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
		emailTouched = false;
		sendingState = 'idle';
	}

	function goBack() {
		showCodeInput = false;
		code = '';
		error = '';
	}

	$effect(() => {
		if (!isOpen) {
			resetState();
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div class="fixed inset-0 z-[100] modal-enter">
		<!-- Warm stucco backdrop -->
		<div class="absolute inset-0 backdrop-blur-xl" style="background: rgba(243, 233, 225, 0.4);"></div>
		<div class="absolute inset-0 stucco-gradient"></div>

		<button
			onclick={() => { onClose(); resetState(); }}
			class="absolute top-10 left-10 text-ash/40 hover:text-walnut transition-colors duration-300 z-10"
			style="font-family: 'DM Sans', sans-serif;"
			aria-label="Close"
		>
			<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="1.5"/>
			</svg>
		</button>

		<div class="relative flex items-center justify-center h-full">
			<div class="w-full max-w-sm px-6">
				<p class="text-ash/40 text-[13px] tracking-[0.25em] uppercase mb-10 text-center" style="font-family: 'DM Sans', sans-serif; font-weight: 500;">Admin</p>

				{#if !showCodeInput}
					<form onsubmit={handleEmailSubmit} class="space-y-6">
						<div>
							<input
								id="email"
								type="email"
								bind:value={email}
								required
								disabled={isLoading}
								class="modal-input"
								class:modal-input-error={showEmailError || error}
								placeholder="Email"
								onfocus={() => { emailTouched = true; }}
								onblur={() => { emailTouched = true; }}
							/>
							{#if showEmailError}
								<p class="field-error slide-down">Invalid email address</p>
							{/if}
						</div>

						{#if error}
							<p class="field-error text-center shake">{error}</p>
						{/if}

						{#if canSubmitEmail}
							<button
								type="submit"
								disabled={isLoading}
								class="modal-button button-enter"
							>
								{#if sendingState === 'sending'}
									<span class="inline-flex items-center gap-2.5">
										<span class="sending-dot"></span>
										<span class="sending-dot" style="animation-delay: 0.15s"></span>
										<span class="sending-dot" style="animation-delay: 0.3s"></span>
									</span>
								{:else if sendingState === 'sent'}
									<span class="inline-flex items-center gap-2">
										<svg width="16" height="16" viewBox="0 0 14 14" fill="none" class="sent-check">
											<path d="M2 7.5L5.5 11L12 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										</svg>
										Sent
									</span>
								{:else}
									Send Code
								{/if}
							</button>
						{/if}
					</form>
				{:else}
					<div class="step-enter">
						<form onsubmit={handleCodeSubmit} class="space-y-6">
							<p class="text-center text-ash/60 text-[13px] tracking-[0.2em] uppercase mb-8" style="font-family: 'DM Sans', sans-serif; font-weight: 500;">
								Code sent to {email}
							</p>

							<div>
								<input
									id="code"
									type="text"
									bind:value={code}
									required
									disabled={isLoading}
									class="modal-input text-center tracking-[0.3em]"
									class:modal-input-error={!!error}
									placeholder="000000"
									maxlength="6"
								/>
							</div>

							{#if error}
								<p class="field-error text-center shake">{error}</p>
							{/if}

							{#if canSubmitCode}
								<button
									type="submit"
									disabled={isLoading}
									class="modal-button button-enter"
								>
									{#if isLoading}
										<span class="inline-flex items-center gap-2.5">
											<span class="sending-dot"></span>
											<span class="sending-dot" style="animation-delay: 0.15s"></span>
											<span class="sending-dot" style="animation-delay: 0.3s"></span>
										</span>
									{:else}
										Sign In
									{/if}
								</button>
							{/if}

							<button
								type="button"
								onclick={goBack}
								disabled={isLoading}
								class="w-full text-center text-ash/40 hover:text-copper text-[13px] tracking-[0.15em] uppercase transition-colors duration-300 disabled:opacity-50 pt-2"
								style="font-family: 'DM Sans', sans-serif; font-weight: 500;"
							>
								Use a different email
							</button>
						</form>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.stucco-gradient {
		background: radial-gradient(
			ellipse at center,
			rgba(245, 241, 235, 0.95) 0%,
			rgba(243, 233, 225, 0.9) 30%,
			rgba(253, 218, 130, 0.15) 60%,
			transparent 85%
		);
	}

	.modal-input {
		width: 100%;
		padding: 16px 18px;
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid rgba(138, 128, 120, 0.2);
		border-radius: 1px;
		color: #2C2218;
		font-family: 'DM Sans', sans-serif;
		font-size: 17px;
		font-weight: 400;
		letter-spacing: 0.03em;
		outline: none;
		backdrop-filter: blur(12px);
		transition: border-color 0.3s ease, background 0.3s ease;
	}

	.modal-input::placeholder {
		color: rgba(138, 128, 120, 0.5);
		font-weight: 400;
		font-size: 17px;
	}

	.modal-input:focus {
		border-color: #B87333;
		background: rgba(255, 255, 255, 0.65);
	}

	.modal-input:disabled {
		opacity: 0.5;
	}

	.modal-input-error {
		border-color: #B87333;
	}

	.modal-button {
		width: 100%;
		padding: 14px 0;
		background: transparent;
		border: none;
		color: #2C2218;
		font-family: 'DM Sans', sans-serif;
		font-size: 14px;
		font-weight: 500;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		cursor: pointer;
		transition: color 0.3s ease;
	}

	.modal-button:hover {
		color: #B87333;
	}

	.modal-button:disabled {
		cursor: default;
	}

	.field-error {
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		font-weight: 500;
		letter-spacing: 0.1em;
		color: #B87333;
		margin-top: 10px;
	}

	/* Animations */
	.modal-enter {
		animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.button-enter {
		animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.step-enter {
		animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.slide-down {
		animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.shake {
		animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
	}

	.sending-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #2C2218;
		display: inline-block;
		animation: pulse 0.6s ease-in-out infinite alternate;
	}

	.sent-check {
		animation: drawCheck 0.3s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideUp {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes slideDown {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-4px); }
		40% { transform: translateX(4px); }
		60% { transform: translateX(-3px); }
		80% { transform: translateX(2px); }
	}

	@keyframes pulse {
		from { opacity: 0.3; }
		to { opacity: 1; }
	}

	@keyframes drawCheck {
		from { stroke-dashoffset: 20; stroke-dasharray: 20; }
		to { stroke-dashoffset: 0; stroke-dasharray: 20; }
	}
</style>
