<script lang="ts">
	import { useClerkContext } from 'svelte-clerk';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

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
	// Clerk's script loads when the modal first opens, so the form waits for it.
	const canSubmitEmail = $derived(isEmailValid && !isLoading && ctx.isLoaded);
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
				await goto(resolve('/admin'));
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
	<div class="fixed inset-0 z-[10001]">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="modal-backdrop flex h-full items-center justify-center p-4"
			onclick={() => { if (!isLoading) { onClose(); resetState(); } }}
		>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="modal-card modal-enter relative w-full max-w-[420px]"
				role="dialog"
				tabindex="-1"
				aria-modal="true"
				aria-labelledby="login-title"
				onclick={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					onclick={() => { onClose(); resetState(); }}
					class="modal-close"
					aria-label="Close"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="square" stroke-width="1.25" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>

				<header class="modal-header">
					<p class="modal-eyebrow">Ethan Hathaway</p>
					<h2 id="login-title" class="modal-title">Admin</h2>
				</header>

				{#if !showCodeInput}
					<form onsubmit={handleEmailSubmit} class="modal-body">
						<div>
							<label class="modal-label" for="email">Email</label>
							<input
								id="email"
								type="email"
								bind:value={email}
								required
								disabled={isLoading}
								class={['modal-input', { 'modal-input-error': showEmailError || error }]}
								autocomplete="email"
								onfocus={() => { emailTouched = true; }}
								onblur={() => { emailTouched = true; }}
							/>
							{#if showEmailError}
								<p class="field-error slide-down">Invalid email address</p>
							{/if}
						</div>

						{#if error}
							<p class="field-error shake" role="alert">{error}</p>
						{/if}

						<button type="submit" disabled={!canSubmitEmail} class="modal-button">
							{#if sendingState === 'sending'}
								<span class="inline-flex items-center gap-2.5" aria-label="Sending">
									<span class="sending-dot"></span>
									<span class="sending-dot" style="animation-delay: 0.15s"></span>
									<span class="sending-dot" style="animation-delay: 0.3s"></span>
								</span>
							{:else if sendingState === 'sent'}
								<span class="inline-flex items-center gap-2">
									<svg width="16" height="16" viewBox="0 0 14 14" fill="none" class="sent-check">
										<path d="M2 7.5L5.5 11L12 3" stroke="currentColor" stroke-width="1.25" stroke-linecap="square"/>
									</svg>
									Sent
								</span>
							{:else}
								Send Code
							{/if}
						</button>
					</form>
				{:else}
					<form onsubmit={handleCodeSubmit} class="modal-body step-enter">
						<div>
							<label class="modal-label" for="code">Code sent to {email}</label>
							<input
								id="code"
								type="text"
								bind:value={code}
								required
								disabled={isLoading}
								class={['modal-input tracking-[0.3em]', { 'modal-input-error': !!error }]}
								placeholder="000000"
								maxlength="6"
								inputmode="numeric"
								autocomplete="one-time-code"
							/>
						</div>

						{#if error}
							<p class="field-error shake" role="alert">{error}</p>
						{/if}

						<button type="submit" disabled={!canSubmitCode} class="modal-button">
							{#if isLoading}
								<span class="inline-flex items-center gap-2.5" aria-label="Signing in">
									<span class="sending-dot"></span>
									<span class="sending-dot" style="animation-delay: 0.15s"></span>
									<span class="sending-dot" style="animation-delay: 0.3s"></span>
								</span>
							{:else}
								Sign In
							{/if}
						</button>

						<button type="button" onclick={goBack} disabled={isLoading} class="modal-link">
							Use a different email
						</button>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		background: rgba(250, 243, 230, 0.55);
		-webkit-backdrop-filter: blur(24px) saturate(110%);
		backdrop-filter: blur(24px) saturate(110%);
	}

	.modal-card {
		background: rgba(251, 241, 227, 0.88);
		border: 1px solid rgba(61, 46, 30, 0.18);
		color: #2c2218;
		font-family: 'DM Sans', sans-serif;
	}

	.modal-close {
		position: absolute;
		top: -1px;
		right: -1px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border: 1px solid rgba(61, 46, 30, 0.18);
		color: #3d2e1e;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.modal-close:hover {
		background: rgba(61, 46, 30, 0.06);
	}

	.modal-header {
		padding: 32px 32px 24px;
		border-bottom: 1px solid rgba(61, 46, 30, 0.14);
	}

	.modal-eyebrow,
	.modal-label {
		display: block;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #5f5044;
	}

	.modal-title {
		margin-top: 10px;
		font-family: 'Playfair Display', Georgia, serif;
		font-size: 34px;
		font-weight: 400;
		line-height: 1.1;
		color: #2c2218;
	}

	.modal-body {
		display: grid;
		gap: 20px;
		padding: 24px 32px 32px;
	}

	.modal-label {
		margin-bottom: 8px;
		overflow-wrap: anywhere;
	}

	.modal-input {
		width: 100%;
		height: 48px;
		padding: 0 14px;
		background: rgba(255, 255, 255, 0.45);
		border: 1px solid rgba(61, 46, 30, 0.22);
		border-radius: 0;
		color: #2c2218;
		font-size: 16px;
		outline: none;
		transition: border-color 0.2s ease, background-color 0.2s ease;
	}

	.modal-input::placeholder {
		color: rgba(95, 80, 68, 0.55);
	}

	.modal-input:focus {
		border-color: #3d2e1e;
		background: rgba(255, 255, 255, 0.7);
	}

	.modal-input:disabled {
		opacity: 0.5;
	}

	.modal-input-error {
		border-color: #9a5a22;
	}

	.modal-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 48px;
		background: #2c2218;
		border: 1px solid #2c2218;
		color: #fbf1e3;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
	}

	.modal-button:hover:not(:disabled) {
		background: #3d2e1e;
	}

	.modal-button:disabled {
		background: transparent;
		border-color: rgba(61, 46, 30, 0.18);
		color: rgba(61, 46, 30, 0.45);
		cursor: default;
	}

	.modal-link {
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: #5f5044;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.modal-link:hover {
		color: #2c2218;
	}

	.modal-link:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.modal-close:focus-visible,
	.modal-button:focus-visible,
	.modal-link:focus-visible {
		outline: 1px solid #3d2e1e;
		outline-offset: 2px;
	}

	.field-error {
		margin-top: 8px;
		font-size: 13px;
		color: #9a5a22;
	}

	/* Animations */
	/* Fade only the card: an ancestor below full opacity stops the backdrop's blur reaching the page. */
	.modal-enter {
		animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
		background: currentColor;
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
