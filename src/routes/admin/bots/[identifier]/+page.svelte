<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { useClerkContext } from 'svelte-clerk';

	interface Checkin {
		id: number;
		identifier: string;
		userAgent: string;
		payload: string;
		ipAddress: string | null;
		createdAt: string;
	}

	interface BotMessage {
		id: number;
		botIdentifier: string;
		message: string;
		isRead: boolean;
		createdAt: string;
	}

	const ctx = useClerkContext();
	const identifier = $derived($page.params.identifier);

	let checkins = $state<Checkin[]>([]);
	let messages = $state<BotMessage[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');
	let newMessage = $state('');
	let sending = $state(false);

	async function getToken() {
		const clerk = ctx.clerk;
		const session = clerk?.session;
		if (!session) return null;
		return session.getToken();
	}

	async function loadData() {
		loading = true;
		errorMsg = '';
		try {
			const token = await getToken();
			const headers: Record<string, string> = {};
			if (token) headers.Authorization = `Bearer ${token}`;

			const [checkinsRes, messagesRes] = await Promise.all([
				fetch(`/api/admin/bots/${identifier}`, { headers }),
				fetch(`/api/admin/bots/${identifier}/messages`, { headers })
			]);

			if (!checkinsRes.ok) throw new Error('Failed to load check-ins');
			if (!messagesRes.ok) throw new Error('Failed to load messages');

			checkins = await checkinsRes.json();
			messages = await messagesRes.json();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	async function sendMessage() {
		if (!newMessage.trim() || sending) return;
		sending = true;
		errorMsg = '';
		try {
			const token = await getToken();
			const headers: Record<string, string> = { 'Content-Type': 'application/json' };
			if (token) headers.Authorization = `Bearer ${token}`;

			const res = await fetch(`/api/admin/bots/${identifier}/messages`, {
				method: 'POST',
				headers,
				body: JSON.stringify({ message: newMessage.trim() })
			});

			if (!res.ok) {
				const body = await res.json().catch(() => null);
				throw new Error(body?.message || 'Failed to send message');
			}

			const created: BotMessage = await res.json();
			messages = [created, ...messages];
			newMessage = '';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to send message';
		} finally {
			sending = false;
		}
	}

	function parsePayload(raw: string): Record<string, string> {
		try {
			return JSON.parse(raw);
		} catch {
			return { raw };
		}
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr + 'Z').toLocaleString();
	}

	onMount(() => {
		void loadData();
	});
</script>

<div class="max-w-4xl">
	<div class="mb-6">
		<a
			href="/admin/bots"
			class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors duration-150 mb-3"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to bots
		</a>
		<h1 class="text-xl font-semibold text-slate-900">
			Bot <span class="font-mono text-base text-slate-500">{identifier}</span>
		</h1>
		{#if checkins.length > 0}
			<p class="text-xs text-slate-400 mt-1">{checkins[0].userAgent}</p>
		{/if}
	</div>

	{#if errorMsg}
		<p class="text-sm text-red-600 mb-4">{errorMsg}</p>
	{/if}

	{#if loading}
		<p class="text-sm text-slate-400">Loading...</p>
	{:else}
		<div class="grid gap-8">
			<!-- Messages Section -->
			<section>
				<h2 class="text-sm font-semibold text-slate-900 mb-3">Messages</h2>

				<!-- Compose -->
				<div class="rounded-xl border border-slate-200 bg-white p-4 mb-4">
					<label class="grid gap-2">
						<span class="text-xs font-medium text-slate-600">Send a message to this bot</span>
						<textarea
							bind:value={newMessage}
							rows="3"
							class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all duration-150 resize-y"
							placeholder="Write a message for this bot to read on their next visit..."
						></textarea>
					</label>
					<div class="flex justify-end mt-2">
						<button
							type="button"
							disabled={!newMessage.trim() || sending}
							onclick={sendMessage}
							class="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
						>
							{sending ? 'Sending...' : 'Send'}
						</button>
					</div>
				</div>

				{#if messages.length === 0}
					<p class="text-xs text-slate-400">No messages sent to this bot yet.</p>
				{:else}
					<div class="space-y-2">
						{#each messages as msg (msg.id)}
							<div class="rounded-lg border border-slate-100 bg-white px-4 py-3">
								<div class="flex items-start justify-between gap-3">
									<p class="text-sm text-slate-700 whitespace-pre-wrap">{msg.message}</p>
									<span class={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${msg.isRead ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
										{msg.isRead ? 'Read' : 'Unread'}
									</span>
								</div>
								<p class="text-[11px] text-slate-400 mt-1">{formatDate(msg.createdAt)}</p>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Check-ins Section -->
			<section>
				<h2 class="text-sm font-semibold text-slate-900 mb-3">
					Check-ins <span class="text-slate-400 font-normal">({checkins.length})</span>
				</h2>

				{#if checkins.length === 0}
					<p class="text-xs text-slate-400">No check-ins found.</p>
				{:else}
					<div class="space-y-3">
						{#each checkins as checkin (checkin.id)}
							{@const payload = parsePayload(checkin.payload)}
							<div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
								<div class="flex items-center justify-between mb-2">
									<span class="text-[11px] text-slate-400">{formatDate(checkin.createdAt)}</span>
									{#if checkin.ipAddress}
										<span class="text-[11px] font-mono text-slate-300">{checkin.ipAddress}</span>
									{/if}
								</div>
								<div class="grid gap-1.5">
									{#each Object.entries(payload) as [key, value] (key)}
										{#if value}
											<div class="flex gap-2 text-xs">
												<span class="font-medium text-slate-500 shrink-0 w-16">{key}</span>
												<span class="text-slate-700">{value}</span>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	{/if}
</div>
