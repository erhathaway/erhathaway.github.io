<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { useClerkContext } from 'svelte-clerk';

	const ctx = useClerkContext();

	let connected = $state(false);
	let connectedAt = $state<string | null>(null);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');
	let disconnecting = $state(false);

	async function getToken() {
		const session = ctx.clerk?.session;
		if (!session) return null;
		return session.getToken();
	}

	async function fetchStatus() {
		loading = true;
		error = '';
		try {
			const token = await getToken();
			if (!token) return;
			const response = await fetch('/api/integrations/google-photos/status', {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) throw new Error('Failed to fetch status');
			const data = await response.json();
			connected = data.connected;
			connectedAt = data.connectedAt ?? null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load status';
		} finally {
			loading = false;
		}
	}

	async function handleConnect() {
		// Browser redirect — Clerk middleware handles auth via cookies
		window.location.href = '/api/integrations/google-photos/connect';
	}

	async function handleDisconnect() {
		if (!confirm('Disconnect Google Photos? Existing imported artifacts will not be affected.')) return;
		disconnecting = true;
		error = '';
		try {
			const token = await getToken();
			if (!token) return;
			const response = await fetch('/api/integrations/google-photos/disconnect', {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!response.ok) throw new Error('Failed to disconnect');
			connected = false;
			connectedAt = null;
			success = 'Google Photos disconnected.';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to disconnect';
		} finally {
			disconnecting = false;
		}
	}

	onMount(() => {
		// Check URL params for OAuth callback results
		const urlError = $page.url.searchParams.get('error');
		const urlConnected = $page.url.searchParams.get('connected');
		if (urlError) {
			error = decodeURIComponent(urlError);
		}
		if (urlConnected === 'true') {
			success = 'Google Photos connected successfully.';
		}

		// Wait for Clerk to be ready before fetching status
		const interval = setInterval(async () => {
			if (ctx.clerk?.session) {
				clearInterval(interval);
				fetchStatus();
			}
		}, 100);

		// Fallback: try immediately in case already ready
		fetchStatus();

		return () => clearInterval(interval);
	});
</script>

<div class="max-w-xl">
	<h1 class="text-xl font-semibold text-slate-900 mb-1">Google Photos</h1>
	<p class="text-sm text-slate-500 mb-6">Import images and videos from your Google Photos library into projects.</p>

	{#if error}
		<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
			{error}
		</div>
	{/if}

	{#if success}
		<div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 mb-4">
			{success}
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center gap-2 text-sm text-slate-400">
			<div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500"></div>
			Loading...
		</div>
	{:else if connected}
		<div class="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
			<div class="flex items-center gap-3">
				<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
					<svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</span>
				<div>
					<p class="text-sm font-medium text-slate-900">Connected</p>
					{#if connectedAt}
						<p class="text-xs text-slate-400">Since {new Date(connectedAt).toLocaleDateString()}</p>
					{/if}
				</div>
			</div>

			<p class="text-xs text-slate-500">
				Imported media is copied to your storage. Disconnecting will not affect existing artifacts.
			</p>

			<button
				type="button"
				onclick={handleDisconnect}
				disabled={disconnecting}
				class="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors duration-150 disabled:opacity-50"
			>
				{disconnecting ? 'Disconnecting...' : 'Disconnect'}
			</button>
		</div>
	{:else}
		<div class="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
			<div class="flex items-center gap-3">
				<span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
					<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
				</span>
				<div>
					<p class="text-sm font-medium text-slate-900">Not connected</p>
					<p class="text-xs text-slate-400">Connect to import photos and videos</p>
				</div>
			</div>

			<p class="text-xs text-slate-500">
				Read-only access. We can only view photos you explicitly share through the picker.
			</p>

			<button
				type="button"
				onclick={handleConnect}
				class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
			>
				Connect Google Photos
			</button>
		</div>
	{/if}
</div>
